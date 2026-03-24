import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const brandId = req.nextUrl.searchParams.get('brandId')

  let query = supabase
    .from('jobs')
    .select('*, videos(public_url, thumbnail, status)')
    .order('created_at', { ascending: false })

  if (brandId) {
    query = query.eq('brand_id', brandId)
  } else {
    query = query.limit(20)
  }

  const { data: jobs } = await query

  return NextResponse.json(jobs || [])
}
