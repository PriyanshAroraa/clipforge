import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { platforms } from '@/lib/platforms'

// POST: immediately post a video to a platform
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { videoId, platform, caption } = await req.json()

  if (!videoId || !platform) {
    return NextResponse.json({ error: 'videoId and platform are required' }, { status: 400 })
  }

  // Get video
  const { data: video } = await supabase
    .from('videos')
    .select('file_path, caption')
    .eq('id', videoId)
    .single()

  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  // Get platform connection
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('platform', platform)
    .single()

  if (!connection) {
    return NextResponse.json({ error: `${platform} is not connected` }, { status: 400 })
  }

  const poster = platforms[platform]
  if (!poster) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  // Refresh token if near expiry
  if (poster.refreshToken && connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at)
    if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      try {
        const newTokens = await poster.refreshToken(connection)
        await supabase
          .from('platform_connections')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || connection.refresh_token,
            token_expires_at: newTokens.expires_at || connection.token_expires_at,
          })
          .eq('id', connection.id)
        connection.access_token = newTokens.access_token
      } catch (e: any) {
        return NextResponse.json({ error: `Token refresh failed: ${e.message}` }, { status: 500 })
      }
    }
  }

  const postCaption = caption || video.caption || ''
  const result = await poster.post(connection, video.file_path, postCaption)

  // Record in scheduled_posts as "posted now"
  await supabase.from('scheduled_posts').insert({
    user_id: user.id,
    video_id: videoId,
    platform,
    scheduled_at: new Date().toISOString(),
    caption: postCaption,
    status: result.success ? 'posted' : 'error',
    posted_at: result.success ? new Date().toISOString() : null,
    platform_post_id: result.platform_post_id || null,
    error_msg: result.error || null,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, platform_post_id: result.platform_post_id })
}
