import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/index';
import { runEngine, extractThumbnail, EngineType } from '@/lib/engines/runner';
import fs from 'fs';
import path from 'path';

const ENGINES: EngineType[] = ['wall_of_text', 'hook_demo', 'meme_video', 'reddit_video'];

export async function POST(req: NextRequest) {
  const { brandId, engines = ENGINES } = await req.json();
  const brand = db.prepare('SELECT * FROM brands WHERE id = ?').get(brandId) as any;
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

  const jobIds: number[] = [];

  for (const engine of engines) {
    const job = db.prepare('INSERT INTO jobs (brand_id, engine, status) VALUES (?, ?, ?)').run(brandId, engine, 'pending');
    jobIds.push(job.lastInsertRowid as number);
  }

  // Fire and forget
  void runAllEngines(brand, engines, jobIds);

  return NextResponse.json({ jobIds });
}

async function runAllEngines(brand: any, engines: EngineType[], jobIds: number[]) {
  for (let i = 0; i < engines.length; i++) {
    const engine = engines[i];
    const jobId = jobIds[i];

    db.prepare('UPDATE jobs SET status = ?, started_at = unixepoch() WHERE id = ?').run('running', jobId);

    try {
      const { outputPath } = await runEngine(engine, brand.url);
      const thumb = await extractThumbnail(outputPath);
      const stat = fs.statSync(outputPath);
      const publicUrl = '/videos/' + path.basename(outputPath);
      const thumbUrl = thumb ? '/videos/' + path.basename(thumb) : null;

      const video = db.prepare(
        'INSERT INTO videos (brand_id, engine, file_path, public_url, status, thumbnail, file_size_mb) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(brand.id, engine, outputPath, publicUrl, 'ready', thumbUrl, +(stat.size / 1024 / 1024).toFixed(1));

      db.prepare('UPDATE jobs SET status = ?, finished_at = unixepoch(), video_id = ? WHERE id = ?')
        .run('done', video.lastInsertRowid, jobId);

    } catch(e: any) {
      db.prepare('UPDATE jobs SET status = ?, error_msg = ?, finished_at = unixepoch() WHERE id = ?')
        .run('error', e.message?.slice(0,500), jobId);
    }
  }
}
