import axios from 'axios';
import { spawnSync } from 'child_process';
import fs from 'fs';

const FFMPEG    = 'C:\\Users\\priya\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';
const FONT      = 'D\\:/newww/fonts/Poppins-Medium.ttf';
const GEMINI_KEY = 'AIzaSyBaK_EggNtxGXeoL-KMVHFscg6S7JAXHk8';

const BG_DIR    = 'd:/newww/bg_videos';
const MEME_DIR  = 'd:/newww/green_screen_memes';
const OUTPUT    = process.env.CLIPFORGE_OUTPUT || 'd:/newww/meme_output.mp4';

// ── Pick random bg video ──────────────────────────────────────────────────────
function pickRandom(dir, exts) {
  const files = fs.readdirSync(dir).filter(f => exts.some(e => f.endsWith(e)));
  return `${dir}/${files[Math.floor(Math.random() * files.length)]}`;
}

// ── Pick random meme video ────────────────────────────────────────────────────
const catalog = JSON.parse(fs.readFileSync(`${MEME_DIR}/catalog.json`, 'utf8'));
// Only use memes confirmed to have green screens
const greenMemes = catalog.filter(m => fs.existsSync(m.file));
const meme = greenMemes.find(m => m.file.includes('Jackpot')) || greenMemes[Math.floor(Math.random() * greenMemes.length)];
console.log('Meme:', meme.name);

const bgImage = 'd:/newww/ai_bg.jpg';
console.log('BG: AI generated stable');

// ── Get meme duration ─────────────────────────────────────────────────────────
const FFPROBE = FFMPEG.replace('ffmpeg.exe', 'ffprobe.exe');
const probe   = spawnSync(FFPROBE, [
  '-v', 'quiet', '-print_format', 'json', '-show_format', meme.file
], { encoding: 'utf8' });
const duration = parseFloat(JSON.parse(probe.stdout).format.duration);

// ── Generate "When you..." caption with Gemini ────────────────────────────────
// Hardcoded caption (swap Gemini back in when rate limit resets)
let caption = 'POV: you breed a champion on Owners Club and now you\'re rethinking your entire life plan';
if (false) try {
  console.log('Generating caption...');
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    { contents: [{ parts: [{ text: `Write a short viral TikTok meme caption for a video that combines:
- Meme: "${meme.name}" — ${meme.description}
- Game: Owners Club, a mobile horse racing game where you own, train and race horses

Format rules:
- Start with "When you" or "Me when" or "POV:"
- Funny and relatable gaming humor
- Max 12 words
- Mixed case (not all caps, not all lowercase)
- No hashtags, no emojis

Return ONLY the caption.` }] }] },
    { headers: { 'Content-Type': 'application/json' } }
  );
  caption = res.data.candidates[0].content.parts[0].text.trim();
} catch(e) {
  // Fallback captions if rate limited
  const fallbacks = [
    'POV: you breed a champion on Owners Club and now you\'re rethinking your entire life plan',
    'When you open Owners Club to check one thing and it\'s suddenly 3 races later',
    'Me when my Owners Club horse wins at 20-1 odds and I called it all week',
    'When you finally nail the training schedule and your horse dominates the whole field',
  ];
  caption = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  console.log('Rate limited, using fallback caption');
}
console.log('Caption:', caption);

// ── Wrap text into lines ──────────────────────────────────────────────────────
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
  return s.replace(/\\/g,'\\\\').replace(/'/g,'\u2019').replace(/:/g,'\\:').replace(/,/g,'\\,').replace(/\[/g,'\\[').replace(/\]/g,'\\]');
}

const lines      = wrapText(caption, 30);
const fontSize   = 52;
const lineSpacing = 12;
const startY     = 70;

const textFilters = lines.map((line, i) =>
  `drawtext=fontfile='${FONT}':text='${esc(line)}':fontsize=${fontSize}:fontcolor=#FFFFFF:borderw=4:bordercolor=#000000:x=(w-text_w)/2:y=${startY + i * (fontSize + lineSpacing)}`
).join(',');

// ── FFmpeg filter complex ─────────────────────────────────────────────────────
// 0: bg lifestyle video  → scale to 1080x1920, slightly darkened
// 1: meme green screen   → chroma key, scale to fill bottom 60% of frame
// overlay + text

const filterComplex = [
  // BG: crop white bar, scale to 1080x1920
  '[0:v]crop=700:1408:68:0,scale=1080:1920,format=yuv420p[bg]',
  // Meme: chroma key, scale to 900w, animate from center-big to bottom-right-small
  '[1:v]scale=900:-1,format=yuva420p,chromakey=color=0x00FF00:similarity=0.32:blend=0.06[meme]',
  '[bg][meme]overlay=x=(W-w)/2:y=(H-h)[comp]',
  `[comp]${textFilters}[out]`,
].join(';');

const args = [
  '-y',
  '-loop', '1', '-framerate', '30', '-i', bgImage,
  '-i', meme.file,
  '-t', String(duration),
  '-filter_complex', filterComplex,
  '-map', '[out]',
  '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
  '-c:a', 'aac', '-b:a', '192k',
  '-shortest',
  OUTPUT
];

console.log('Building...');
const result = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });

if (result.status !== 0) {
  console.error('FFmpeg failed:\n', result.stderr?.slice(-3000));
} else {
  const size = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`Done! ${OUTPUT} (${size} MB)`);
}
