import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    { count: total },
    { count: saved },
    { count: skipped },
    { data: allVideos },
    { data: recentJobs },
  ] = await Promise.all([
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('swipe_action', 'saved'),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('swipe_action', 'skipped'),
    supabase.from('videos').select('engine').eq('status', 'ready'),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  // Aggregate by engine client-side
  const engineCounts: Record<string, number> = {}
  for (const v of allVideos || []) {
    engineCounts[v.engine] = (engineCounts[v.engine] || 0) + 1
  }
  const byEngine = Object.entries(engineCounts).map(([engine, count]) => ({ engine, count }))

  return NextResponse.json({ total, saved, skipped, byEngine, recentJobs: recentJobs || [] })
}
