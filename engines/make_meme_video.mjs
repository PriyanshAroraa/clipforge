import { spawnSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pickBgVideo } from './drive_bg.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUTPUT = process.env.CLIPFORGE_OUTPUT;
const SITE_URL = process.env.CLIPFORGE_SITE_URL || 'https://example.com';
const GEMINI_KEY = process.env.CLIPFORGE_GEMINI_KEY;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FONT = path.join(__dirname, 'fonts', 'Poppins-Medium.ttf').replace(/\\/g, '/').replace(/:/g, '\\:');
const BG_VIDEO_DIR = path.join(__dirname, 'bg_videos');

if (!OUTPUT) { console.error('CLIPFORGE_OUTPUT required'); process.exit(1); }

function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`
    );
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.candidates?.[0]?.content?.parts?.[0]?.text || '');
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*?\}/);
  return match ? JSON.parse(match[0]) : null;
}

function wrapText(text, max = 24) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line.trim());
  return lines;
}

function esc(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

async function main() {
  console.log('[meme_video] Generating caption for', SITE_URL);

  let top = 'WHEN YOU FINALLY DISCOVER';
  let bottom = 'THIS BRAND';

  if (GEMINI_KEY) {
    const raw = await callGemini(
      `Generate a funny meme caption about discovering this website/brand: ${SITE_URL}. Classic meme format with top text and bottom text. Keep each part under 40 characters. Return JSON only with keys: top, bottom.`
    );
    const obj = parseJSON(raw);
    if (obj?.top) top = obj.top;
    if (obj?.bottom) bottom = obj.bottom;
  }

  console.log('[meme_video] Top:', top);
  console.log('[meme_video] Bottom:', bottom);

  const useFont = fs.existsSync(path.join(__dirname, 'fonts', 'Poppins-Medium.ttf'));
  const fontPart = useFont ? `fontfile='${FONT}':` : '';

  const topLines = wrapText(top.toUpperCase(), 24);
  const bottomLines = wrapText(bottom.toUpperCase(), 24);

  const topFilters = topLines.map((line, i) =>
    `drawtext=${fontPart}text='${esc(line)}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=${200 + i * 90}:borderw=5:bordercolor=black`
  ).join(',');

  const bottomFilters = bottomLines.map((line, i) =>
    `drawtext=${fontPart}text='${esc(line)}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=${1400 + i * 90}:borderw=5:bordercolor=black`
  ).join(',');

  const allFilters = [topFilters, bottomFilters].filter(Boolean).join(',');

  const bgVideo = await pickBgVideo(BG_VIDEO_DIR);

  let args;
  if (bgVideo) {
    const filterComplex = [
      '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p[bg]',
      `[bg]${allFilters}[out]`,
    ].join(';');

    args = ['-y', '-i', bgVideo, '-filter_complex', filterComplex, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-t', '8', OUTPUT];
    console.log('[meme_video] Running FFmpeg (video background)...');
  } else {
    console.log('[meme_video] No bg videos available, using color fallback');
    args = ['-y', '-f', 'lavfi', '-i', 'color=c=0x2ecc71:s=1080x1920:d=8:r=30', '-vf', allFilters, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '8', OUTPUT];
  }

  const result = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (result.status !== 0) {
    console.error('[meme_video] FFmpeg stderr:', result.stderr?.slice(-2000));
    throw new Error('FFmpeg failed');
  }

  console.log('[meme_video] Done:', OUTPUT);
}

main().catch((e) => {
  console.error('[meme_video] Error:', e.message);
  process.exit(1);
});
