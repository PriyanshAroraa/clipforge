import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTikTokAuthUrl } from '@/lib/platforms/tiktok'
import { getInstagramAuthUrl } from '@/lib/platforms/instagram'
import { getYouTubeAuthUrl } from '@/lib/platforms/youtube'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = req.nextUrl.searchParams.get('platform')
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/platforms/callback`

  switch (platform) {
    case 'tiktok':
      return NextResponse.redirect(getTikTokAuthUrl(redirectUri))
    case 'instagram':
      return NextResponse.redirect(getInstagramAuthUrl(redirectUri))
    case 'youtube':
      return NextResponse.redirect(getYouTubeAuthUrl(redirectUri))
    default:
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }
}
