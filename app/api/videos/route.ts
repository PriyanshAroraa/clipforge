import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const unswiped = req.nextUrl.searchParams.get('unswiped')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '0') || 0
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0

  let query = supabase
    .from('videos')
    .select('*')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })

  if (unswiped === 'true') {
    query = query.is('swipe_action', null)
  }

  if (limit > 0) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data: videos } = await query

  return NextResponse.json(videos || [])
}
