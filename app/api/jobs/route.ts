import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/index';

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get('brandId');
  const jobs = brandId
    ? db.prepare('SELECT j.*, v.public_url, v.thumbnail, v.status as video_status FROM jobs j LEFT JOIN videos v ON j.video_id = v.id WHERE j.brand_id = ? ORDER BY j.created_at DESC').all(brandId)
    : db.prepare('SELECT j.*, v.public_url, v.thumbnail FROM jobs j LEFT JOIN videos v ON j.video_id = v.id ORDER BY j.created_at DESC LIMIT 20').all();
  return NextResponse.json(jobs);
}
