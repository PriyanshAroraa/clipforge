import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/index';

export async function GET(req: NextRequest) {
  const unswiped = req.nextUrl.searchParams.get('unswiped');
  const query = unswiped === 'true'
    ? "SELECT * FROM videos WHERE status = 'ready' AND swipe_action IS NULL ORDER BY created_at DESC"
    : "SELECT * FROM videos WHERE status = 'ready' ORDER BY created_at DESC";
  return NextResponse.json(db.prepare(query).all());
}
