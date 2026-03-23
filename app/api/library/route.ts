import { NextResponse } from 'next/server';
import db from '@/db/index';

export async function GET() {
  const videos = db.prepare("SELECT v.*, b.name as brand_name FROM videos v JOIN brands b ON v.brand_id = b.id WHERE v.swipe_action = 'saved' ORDER BY v.swiped_at DESC").all();
  return NextResponse.json(videos);
}
