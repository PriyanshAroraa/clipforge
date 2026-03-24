import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { platforms } from '@/lib/platforms'

// This endpoint processes due scheduled posts.
// Call it via cron (Vercel Cron, Supabase pg_cron, or external).
// Uses service role key to bypass RLS.

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )

  const now = new Date().toISOString()

  // Get due posts
  const { data: duePosts } = await supabase
    .from('scheduled_posts')
    .select('*, videos(file_path, caption)')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(10)

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const post of duePosts) {
    // Mark as posting
    await supabase
      .from('scheduled_posts')
      .update({ status: 'posting' })
      .eq('id', post.id)

    // Get connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', post.user_id)
      .eq('platform', post.platform)
      .single()

    if (!connection) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'error', error_msg: 'Platform not connected' })
        .eq('id', post.id)
      continue
    }

    // Refresh token if needed
    const poster = platforms[post.platform]
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
          await supabase
            .from('scheduled_posts')
            .update({ status: 'error', error_msg: `Token refresh failed: ${e.message}` })
            .eq('id', post.id)
          continue
        }
      }
    }

    // Post
    const videoPath = post.videos?.file_path
    const caption = post.caption || post.videos?.caption || ''

    if (!videoPath) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'error', error_msg: 'Video file not found' })
        .eq('id', post.id)
      continue
    }

    const result = await poster.post(connection, videoPath, caption)

    await supabase
      .from('scheduled_posts')
      .update({
        status: result.success ? 'posted' : 'error',
        posted_at: result.success ? new Date().toISOString() : null,
        platform_post_id: result.platform_post_id || null,
        error_msg: result.error || null,
      })
      .eq('id', post.id)

    processed++
  }

  return NextResponse.json({ processed })
}
