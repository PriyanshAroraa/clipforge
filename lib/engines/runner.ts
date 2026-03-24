import { spawn } from 'child_process';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

const ENGINES_DIR = process.env.ENGINES_DIR || 'd:\\newww';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.cwd(), 'public', 'videos');
const FFMPEG = process.env.FFMPEG_PATH || '';

export type EngineType = 'wall_of_text' | 'hook_demo' | 'meme_video' | 'reddit_video';

const ENGINE_SCRIPTS: Record<EngineType, string> = {
  wall_of_text: path.join(ENGINES_DIR, 'wall_of_text.mjs'),
  hook_demo: path.join(ENGINES_DIR, 'hook_demo.mjs'),
  meme_video: path.join(ENGINES_DIR, 'make_meme_video.mjs'),
  reddit_video: path.join(ENGINES_DIR, 'make_reddit_video.js'),
};

export async function runEngine(engine: EngineType, brandUrl: string): Promise<{ outputPath: string; caption: string }> {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const uuid = randomUUID();
  const outputPath = path.join(OUTPUT_DIR, `${engine}_${uuid}.mp4`);
  const scriptPath = ENGINE_SCRIPTS[engine];

  const env = {
    ...process.env,
    CLIPFORGE_OUTPUT: outputPath,
    CLIPFORGE_SITE_URL: brandUrl,
    CLIPFORGE_GEMINI_KEY: process.env.GEMINI_KEY || '',
    DRIVE_BG_FOLDER_ID: process.env.DRIVE_BG_FOLDER_ID || '',
  };

  return new Promise((resolve, reject) => {
    const isESM = scriptPath.endsWith('.mjs');
    const args = isESM ? ['--input-type=module', scriptPath] : [scriptPath];
    // For .mjs use node directly
    const proc = spawn('node', isESM ? [scriptPath] : [scriptPath], { env, cwd: ENGINES_DIR });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.stdout.on('data', (d) => { console.log(`[${engine}]`, d.toString()); });

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr.slice(-1000)));
      if (!fs.existsSync(outputPath)) return reject(new Error('Output file not created'));
      resolve({ outputPath, caption: '' });
    });
  });
}

export async function extractThumbnail(videoPath: string): Promise<string> {
  const thumbPath = videoPath.replace('.mp4', '_thumb.jpg');
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG, [
      '-y', '-ss', '1', '-i', videoPath,
      '-vframes', '1', '-q:v', '3', thumbPath
    ]);
    proc.on('close', () => resolve(fs.existsSync(thumbPath) ? thumbPath : ''));
  });
}
