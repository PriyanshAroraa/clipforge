import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: videos } = await supabase
    .from('videos')
    .select('*, brands(name)')
    .eq('swipe_action', 'saved')
    .order('swiped_at', { ascending: false })

  return NextResponse.json(videos || [])
}
