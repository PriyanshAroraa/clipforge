import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { exchangeTikTokCode } from '@/lib/platforms/tiktok'
import { exchangeInstagramCode } from '@/lib/platforms/instagram'
import { exchangeYouTubeCode } from '@/lib/platforms/youtube'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${req.nextUrl.origin}/auth`)

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') // platform name
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/platforms/callback`

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/connections?error=missing_code`)
  }

  try {
    let tokenData: {
      access_token: string
      refresh_token?: string | null
      expires_in?: number
      platform_user_id?: string | null
      platform_username?: string | null
      open_id?: string
    }

    switch (state) {
      case 'tiktok':
        tokenData = await exchangeTikTokCode(code, redirectUri)
        break
      case 'instagram':
        tokenData = await exchangeInstagramCode(code, redirectUri)
        break
      case 'youtube':
        tokenData = await exchangeYouTubeCode(code, redirectUri)
        break
      default:
        return NextResponse.redirect(`${origin}/connections?error=invalid_platform`)
    }

    // Upsert connection — replace existing if reconnecting
    await supabase
      .from('platform_connections')
      .upsert(
        {
          user_id: user.id,
          platform: state,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          platform_user_id: tokenData.platform_user_id || tokenData.open_id || null,
          platform_username: tokenData.platform_username || null,
        },
        { onConflict: 'user_id,platform' }
      )

    return NextResponse.redirect(`${origin}/connections?connected=${state}`)
  } catch (e: any) {
    console.error(`Platform callback error (${state}):`, e.message)
    return NextResponse.redirect(`${origin}/connections?error=${encodeURIComponent(e.message)}`)
  }
}
