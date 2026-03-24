import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET: list scheduled posts
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('*, videos(public_url, thumbnail, engine, caption)')
    .order('scheduled_at', { ascending: true })

  return NextResponse.json(posts || [])
}

// POST: create a scheduled post
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { videoId, platform, scheduledAt, caption } = await req.json()

  if (!videoId || !platform || !scheduledAt) {
    return NextResponse.json({ error: 'videoId, platform, and scheduledAt are required' }, { status: 400 })
  }

  // Verify video ownership
  const { data: video } = await supabase
    .from('videos')
    .select('id, caption')
    .eq('id', videoId)
    .single()

  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  // Verify platform is connected
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('id')
    .eq('platform', platform)
    .single()

  if (!connection) {
    return NextResponse.json({ error: `${platform} is not connected. Connect it first.` }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('scheduled_posts')
    .insert({
      user_id: user.id,
      video_id: videoId,
      platform,
      scheduled_at: scheduledAt,
      caption: caption || video.caption || '',
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(post)
}

// DELETE: cancel a scheduled post
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', id)
    .eq('status', 'scheduled')

  return NextResponse.json({ ok: true })
}
