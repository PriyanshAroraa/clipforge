import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/index';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();
  db.prepare("UPDATE videos SET swipe_action = ?, swiped_at = unixepoch() WHERE id = ?").run(action, id);
  return NextResponse.json({ ok: true });
}
