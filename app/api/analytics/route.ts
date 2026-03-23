import { NextResponse } from 'next/server';
import db from '@/db/index';

export async function GET() {
  const total = (db.prepare("SELECT COUNT(*) as c FROM videos WHERE status='ready'").get() as any).c;
  const saved = (db.prepare("SELECT COUNT(*) as c FROM videos WHERE swipe_action='saved'").get() as any).c;
  const skipped = (db.prepare("SELECT COUNT(*) as c FROM videos WHERE swipe_action='skipped'").get() as any).c;
  const byEngine = db.prepare("SELECT engine, COUNT(*) as count FROM videos GROUP BY engine").all();
  const recentJobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10").all();
  return NextResponse.json({ total, saved, skipped, byEngine, recentJobs });
}
