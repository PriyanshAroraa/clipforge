import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = await req.json()
  if (!platform) return NextResponse.json({ error: 'Platform required' }, { status: 400 })

  await supabase
    .from('platform_connections')
    .delete()
    .eq('platform', platform)

  return NextResponse.json({ ok: true })
}
