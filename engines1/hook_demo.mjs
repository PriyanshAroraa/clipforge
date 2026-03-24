import puppeteer from 'puppeteer';
import axios from 'axios';
import { spawnSync } from 'child_process';
import fs from 'fs';
import { randomUUID } from 'crypto';

// ── PATHS ─────────────────────────────────────────────────────────────────────
const FFMPEG  = 'C:\\Users\\priya\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';
const CHROME  = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FONT    = 'D\\:/newww/fonts/Poppins-Medium.ttf';
const YTDLP   = 'C:\\Users\\priya\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe';

const BG_VIDEO_DIR = 'd:/newww/bg_videos';
const DEMO_VIDEO   = 'd:/newww/a8655c5c-32f2-4bd0-864b-f0652797d24e.mp4';
const SOUND_PATH   = 'd:/newww/trending_sound.mp3';
const _RUN_ID      = process.env.CLIPFORGE_OUTPUT ? randomUUID().slice(0,8) : 'default';
const HOOK_CLIP    = `d:/newww/hook_clip_${_RUN_ID}.mp4`;
const DEMO_CLIP    = `d:/newww/demo_clip_${_RUN_ID}.mp4`;
const OUTPUT       = process.env.CLIPFORGE_OUTPUT || 'd:/newww/hook_demo_output.mp4';
const SITE_URL     = 'http://ownersclub.invinciblegg.com/';
const GEMINI_KEY   = 'AIzaSyBaK_EggNtxGXeoL-KMVHFscg6S7JAXHk8';
const HOOK_DURATION = 4; // seconds for hook segment

// ── PICK RANDOM BG VIDEO ──────────────────────────────────────────────────────
function pickRandomVideo() {
  const exts = ['.mov', '.mp4', '.MOV', '.MP4'];
  const files = fs.readdirSync(BG_VIDEO_DIR)
    .filter(f => exts.some(e => f.endsWith(e)))
    .map(f => `${BG_VIDEO_DIR}/${f}`);
  const pick = files[Math.floor(Math.random() * files.length)];
  console.log(`Picked bg video: ${pick}`);
  return pick;
}

// ── STEP 1: SCRAPE WEBSITE ────────────────────────────────────────────────────
async function scrapeWebsite() {
  console.log('Scraping website...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  const content = await page.evaluate(() => {
    ['script','style','nav','footer','header'].forEach(tag =>
      document.querySelectorAll(tag).forEach(el => el.remove())
    );
    return document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 3000);
  });
  await browser.close();
  console.log(`Scraped ${content.length} chars`);
  return content;
}

// ── STEP 2: GENERATE HOOK TEXT VIA GEMINI ────────────────────────────────────
async function generateHook(productInfo) {
  console.log('Generating hook with Gemini...');
  const prompt = `You are a viral TikTok hook writer. Based on this product info, write a short hook for a TikTok video.

Rules:
- 8-12 words MAX
- Start with "wait", "no way", "bro", "this game", "you can actually", or similar reaction
- Lowercase, minimal punctuation
- Sounds like a genuine reaction/discovery, not an ad
- Must mention the product name naturally
- Creates curiosity or surprise

Product info:
${productInfo}

Return ONLY the hook text, nothing else.`;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const text = res.data.candidates[0].content.parts[0].text.trim();
  console.log('Hook:', text);
  return text;
}

// ── STEP 3: ENSURE TRENDING AUDIO ────────────────────────────────────────────
const SOUND_POOL = [
  'https://www.youtube.com/watch?v=H5v3kku4y6Q',
  'https://www.youtube.com/watch?v=ekr2nIex040',
  'https://www.youtube.com/watch?v=nky4me4NP70',
];

async function ensureAudio() {
  if (fs.existsSync(SOUND_PATH)) {
    console.log('Using cached trending_sound.mp3');
    return SOUND_PATH;
  }
  const url = SOUND_POOL[Math.floor(Math.random() * SOUND_POOL.length)];
  console.log('Downloading trending sound:', url);
  const result = spawnSync(YTDLP, [
    '-x', '--audio-format', 'mp3', '--audio-quality', '0',
    '-o', 'd:/newww/trending_sound.%(ext)s', '--no-playlist', url
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Audio download failed: ' + result.stderr?.slice(-300));
  return SOUND_PATH;
}

// ── STEP 4: WRAP TEXT ─────────────────────────────────────────────────────────
function wrapText(text, maxChars = 22) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function escapeForDrawtext(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

// ── STEP 5: BUILD HOOK CLIP ───────────────────────────────────────────────────
function buildHookClip(bgVideo, hookText) {
  console.log('Building hook clip...');
  const lines      = wrapText(hookText, 22);
  const fontSize   = 58;
  const lineSpacing = 16;
  const totalLines  = lines.length;
  const startY      = `(h-${totalLines}*(${fontSize}+${lineSpacing}))/2`;

  const drawtextFilters = lines.map((line, i) => {
    const safe = escapeForDrawtext(line);
    const y    = `${startY}+${i}*(${fontSize}+${lineSpacing})`;
    return `drawtext=fontfile='${FONT}':text='${safe}':fontsize=${fontSize}:fontcolor=#FFFFFF:borderw=3:bordercolor=#000000:x=(w-text_w)/2:y=${y}`;
  }).join(',');

  const args = [
    '-y',
    '-ss', '0', '-t', String(HOOK_DURATION),
    '-i', bgVideo,
    '-filter_complex',
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,${drawtextFilters}[out]`,
    '-map', '[out]',
    '-an',                  // no audio — we'll add music at concat stage
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    HOOK_CLIP
  ];

  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('Hook clip failed:\n' + r.stderr?.slice(-2000));
  console.log('Hook clip done');
}

// ── STEP 6: BUILD DEMO CLIP ───────────────────────────────────────────────────
function buildDemoClip() {
  console.log('Building demo clip...');
  const args = [
    '-y',
    '-i', DEMO_VIDEO,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p',
    '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    DEMO_CLIP
  ];
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('Demo clip failed:\n' + r.stderr?.slice(-2000));
  console.log('Demo clip done');
}

// ── STEP 7: CONCAT + ADD AUDIO ────────────────────────────────────────────────
function concatAndAddAudio(soundPath) {
  console.log('Concatenating hook + demo and adding audio...');

  // Write concat list
  const concatFile = 'd:/newww/concat_list.txt';
  fs.writeFileSync(concatFile, `file '${HOOK_CLIP.replace(/\\/g, '/')}'\nfile '${DEMO_CLIP.replace(/\\/g, '/')}'`);

  const args = [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', concatFile,  // 0: concatenated video
    '-i', soundPath,                                   // 1: trending audio
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    OUTPUT
  ];

  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('Concat failed:\n' + r.stderr?.slice(-2000));

  const size = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${OUTPUT} (${size} MB)`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const productInfo = await scrapeWebsite();
const hookText    = await generateHook(productInfo);
const soundPath   = await ensureAudio();
const bgVideo     = pickRandomVideo();

buildHookClip(bgVideo, hookText);
buildDemoClip();
concatAndAddAudio(soundPath);

// Cleanup temp files
[HOOK_CLIP, DEMO_CLIP, 'd:/newww/concat_list.txt'].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
console.log('Temp files cleaned up');
