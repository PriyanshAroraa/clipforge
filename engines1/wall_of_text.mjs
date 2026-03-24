import puppeteer from 'puppeteer';
import axios from 'axios';
import { spawnSync } from 'child_process';
import fs from 'fs';

// ── PATHS ─────────────────────────────────────────────────────────────────────
const FFMPEG  = 'C:\\Users\\priya\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';
const YTDLP   = 'C:\\Users\\priya\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe';
const CHROME  = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FONT    = 'D\\:/newww/fonts/Poppins-Medium.ttf';

const BG_VIDEO_DIR = 'd:/newww/bg_videos';
const FALLBACK_VIDEO = 'C:\\Users\\priya\\Downloads\\1762464563352-0-IMG_9525 - Copy - Copy.mov';
const SOUND_PATH   = 'd:/newww/trending_sound.mp3';
const OUTPUT       = process.env.CLIPFORGE_OUTPUT || 'd:/newww/wall_of_text_output.mp4';

// ── PICK RANDOM BG VIDEO ──────────────────────────────────────────────────────
function pickRandomVideo() {
  const exts = ['.mov', '.mp4', '.MOV', '.MP4'];
  let files = [];
  if (fs.existsSync(BG_VIDEO_DIR)) {
    files = fs.readdirSync(BG_VIDEO_DIR)
      .filter(f => exts.some(e => f.endsWith(e)))
      .map(f => `${BG_VIDEO_DIR}/${f}`);
  }
  if (files.length === 0) {
    console.log('No videos in bg_videos/, using fallback');
    return FALLBACK_VIDEO;
  }
  const pick = files[Math.floor(Math.random() * files.length)];
  console.log(`Picked bg video: ${pick}`);
  return pick;
}
const SITE_URL     = 'http://ownersclub.invinciblegg.com/';
const GEMINI_KEY   = 'AIzaSyBaK_EggNtxGXeoL-KMVHFscg6S7JAXHk8';

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
    // Remove scripts, styles, nav, footer junk
    ['script','style','nav','footer','header'].forEach(tag =>
      document.querySelectorAll(tag).forEach(el => el.remove())
    );
    return document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 3000);
  });

  await browser.close();
  console.log(`Scraped ${content.length} chars`);
  return content;
}

// ── STEP 2: GENERATE WALL-OF-TEXT COPY VIA GEMINI ────────────────────────────
async function generateCopy(productInfo) {
  console.log('Generating copy with Gemini...');

  const prompt = `You are a viral TikTok content writer. Based on this product info, write a "wall of text" style TikTok caption.

Rules:
- ALL LOWERCASE, no punctuation except commas and periods sparingly
- First person confession tone like a real user
- 40-70 words max
- Sounds genuine and relatable, not like an ad
- Mention the product name naturally, not salesy
- Hook in the first line
- No hashtags, no emojis

Product info:
${productInfo}

Return ONLY the caption text, nothing else.`;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const text = res.data.candidates[0].content.parts[0].text.trim();
  console.log('Generated copy:\n', text);
  return text;
}

// ── STEP 3: GET TRENDING SOUND ────────────────────────────────────────────────
// Pool of viral/trending YouTube audio — swap these out for whatever's hot
const SOUND_POOL = [
  'https://www.youtube.com/watch?v=H5v3kku4y6Q', // Flowers - Miley Cyrus
  'https://www.youtube.com/watch?v=ekr2nIex040', // Espresso - Sabrina Carpenter
  'https://www.youtube.com/watch?v=nky4me4NP70', // Levitating - Dua Lipa
  'https://www.youtube.com/watch?v=h-BjFGEjmFE', // Stay - Justin Bieber
];

async function getTrendingSound() {
  // Skip if already downloaded
  if (fs.existsSync(SOUND_PATH)) {
    console.log('Using cached trending_sound.mp3');
    return SOUND_PATH;
  }

  // Pick a random sound from the pool
  const url = SOUND_POOL[Math.floor(Math.random() * SOUND_POOL.length)];
  console.log('Downloading trending sound:', url);

  const result = spawnSync(YTDLP, [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', 'd:/newww/trending_sound.%(ext)s',
    '--no-playlist',
    url
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    console.error('yt-dlp failed:', result.stderr?.slice(-500));
    throw new Error('Audio download failed');
  }

  console.log('Audio downloaded:', SOUND_PATH);
  return SOUND_PATH;
}

// ── STEP 4: WRAP TEXT FOR FFMPEG ──────────────────────────────────────────────
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

// ── STEP 5: BUILD VIDEO WITH FFMPEG ──────────────────────────────────────────
function buildVideo(text, soundPath) {
  console.log('Building video with FFmpeg...');

  const lines = wrapText(text, 30);

  // Each line is a separate drawtext filter — avoids \n rendering as box
  const fontSize    = 52;
  const lineSpacing = 18;
  const totalLines  = lines.length;
  const startY      = `(h-${totalLines}*(${fontSize}+${lineSpacing}))/2`;

  const drawtextFilters = lines.map((line, i) => {
    const safe = line
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\u2019')
      .replace(/:/g, '\\:')
      .replace(/,/g, '\\,')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');

    const y = `${startY}+${i}*(${fontSize}+${lineSpacing})`;
    return `drawtext=fontfile='${FONT}':text='${safe}':fontsize=${fontSize}:fontcolor=#FFFFFF:borderw=3:bordercolor=#000000:x=(w-text_w)/2:y=${y}`;
  }).join(',');

  const filterComplex = [
    '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p[bg]',
    `[bg]${drawtextFilters}[out]`,
  ].join(';');

  const args = [
    '-y',
    '-i', pickRandomVideo(), // 0: video clip
    '-i', soundPath,        // 1: trending audio
    '-filter_complex', filterComplex,
    '-map', '[out]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',            // trim to shortest (video or audio)
    OUTPUT
  ];

  const result = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });

  if (result.status !== 0) {
    console.error('FFmpeg failed:\n', result.stderr?.slice(-3000));
    throw new Error('FFmpeg failed');
  }

  const size = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${OUTPUT} (${size} MB)`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const productInfo = await scrapeWebsite();
const copy        = await generateCopy(productInfo);
const soundPath   = await getTrendingSound();
buildVideo(copy, soundPath);
