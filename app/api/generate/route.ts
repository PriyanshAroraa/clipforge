import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { runEngine, extractThumbnail, EngineType } from '@/lib/engines/runner'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const ENGINES: EngineType[] = ['wall_of_text', 'hook_demo', 'meme_video', 'reddit_video']

// Create a client for background tasks that outlive the request.
// Uses the service role key if available (bypasses RLS), otherwise
// creates an authenticated client using the user's access token.
function createBackgroundClient(accessToken?: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  }
  // Fallback: use publishable key with the user's access token for RLS
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the user's session token for background operations
  const { data: { session } } = await supabase.auth.getSession()

  const { brandId, engines = ENGINES } = await req.json()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  // Create job records
  const jobInserts = engines.map((engine: EngineType) => ({
    brand_id: brandId,
    user_id: user.id,
    engine,
    status: 'pending',
  }))

  const { data: jobs, error } = await supabase
    .from('jobs')
    .insert(jobInserts)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jobIds = jobs.map((j: { id: string }) => j.id)

  // Fire and forget — background client with user's token for RLS
  const bgClient = createBackgroundClient(session?.access_token)
  void runAllEngines(brand, engines, jobIds, user.id, bgClient)

  return NextResponse.json({ jobIds })
}

async function runAllEngines(
  brand: any,
  engines: EngineType[],
  jobIds: string[],
  userId: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  // Run all engines in parallel — each video appears in blitz as soon as it's ready
  await Promise.allSettled(
    engines.map(async (engine, i) => {
      const jobId = jobIds[i]

      await supabase.from('jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)

      try {
        const { outputPath } = await runEngine(engine, brand.url)
        const thumb = await extractThumbnail(outputPath)
        const stat = fs.statSync(outputPath)
        const publicUrl = '/videos/' + path.basename(outputPath)
        const thumbUrl = thumb ? '/videos/' + path.basename(thumb) : null

        const { data: video } = await supabase
          .from('videos')
          .insert({
            brand_id: brand.id,
            user_id: userId,
            engine,
            file_path: outputPath,
            public_url: publicUrl,
            status: 'ready',
            thumbnail: thumbUrl,
            file_size_mb: +(stat.size / 1024 / 1024).toFixed(1),
          })
          .select('id')
          .single()

        await supabase
          .from('jobs')
          .update({ status: 'done', finished_at: new Date().toISOString(), video_id: video?.id })
          .eq('id', jobId)

      } catch (e: any) {
        await supabase
          .from('jobs')
          .update({ status: 'error', error_msg: e.message?.slice(0, 500), finished_at: new Date().toISOString() })
          .eq('id', jobId)
      }
    })
  )
}
