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

function wrapText(text, maxCharsPerLine = 30) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxCharsPerLine) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
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
  console.log('[wall_of_text] Generating copy for', SITE_URL);

  let copy = 'okay so i found this site last week and honestly i cant stop thinking about it, the features are actually insane and i feel like nobody is talking about this, like how is this not everywhere already';

  if (GEMINI_KEY) {
    const raw = await callGemini(
      `You are a viral TikTok content writer. Write a "wall of text" style TikTok caption about this website/brand: ${SITE_URL}.

Rules:
- ALL LOWERCASE, no punctuation except commas and periods sparingly
- First person confession tone like a real user
- 40-70 words max
- Sounds genuine and relatable, not like an ad
- Mention the brand/product naturally
- Hook in the first line
- No hashtags, no emojis

Return ONLY the caption text, nothing else.`
    );
    if (raw.trim()) copy = raw.trim();
  }

  console.log('[wall_of_text] Copy:', copy);

  const lines = wrapText(copy, 30);
  const fontSize = 52;
  const lineSpacing = 18;
  const totalLines = lines.length;
  const startY = `(h-${totalLines}*(${fontSize}+${lineSpacing}))/2`;

  const useFont = fs.existsSync(path.join(__dirname, 'fonts', 'Poppins-Medium.ttf'));

  const drawtextFilters = lines.map((line, i) => {
    const safe = esc(line);
    const y = `${startY}+${i}*(${fontSize}+${lineSpacing})`;
    const fontPart = useFont ? `fontfile='${FONT}':` : '';
    return `drawtext=${fontPart}text='${safe}':fontsize=${fontSize}:fontcolor=#FFFFFF:borderw=3:bordercolor=#000000:x=(w-text_w)/2:y=${y}`;
  }).join(',');

  const bgVideo = await pickBgVideo(BG_VIDEO_DIR);

  let args;
  if (bgVideo) {
    const filterComplex = [
      '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p[bg]',
      `[bg]${drawtextFilters}[out]`,
    ].join(';');

    args = [
      '-y',
      '-i', bgVideo,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-an',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-t', '12',
      OUTPUT,
    ];
    console.log('[wall_of_text] Running FFmpeg (video background)...');
  } else {
    console.log('[wall_of_text] No bg videos available, using color fallback');
    args = [
      '-y',
      '-f', 'lavfi', '-i', 'color=c=0x1a1a2e:s=1080x1920:d=12:r=30',
      '-vf', drawtextFilters,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '12',
      OUTPUT,
    ];
  }

  const result = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (result.status !== 0) {
    console.error('[wall_of_text] FFmpeg stderr:', result.stderr?.slice(-2000));
    throw new Error('FFmpeg failed');
  }

  console.log('[wall_of_text] Done:', OUTPUT);
}

main().catch((e) => {
  console.error('[wall_of_text] Error:', e.message);
  process.exit(1);
});
