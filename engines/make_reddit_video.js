const { spawnSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

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

function esc(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function runFfmpeg(args) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('FFmpeg failed:\n' + r.stderr?.slice(-2000));
}

async function main() {
  const { pickBgVideo } = await import('./drive_bg.mjs');

  console.log('[reddit_video] Generating post for', SITE_URL);

  let subreddit = 'r/InternetFinds';
  let title = 'Just found this site and wow';
  let body = 'Has anyone else tried this? I stumbled on it last week and honestly it is pretty solid. The features are way better than I expected for something I found randomly.';

  if (GEMINI_KEY) {
    const raw = await callGemini(
      `Generate a Reddit-style post about this website/brand: ${SITE_URL}. Write as a genuine Reddit user sharing a discovery. Include: subreddit (with r/ prefix, make it relevant), post title (catchy, casual), and post body (3 sentences, authentic Reddit voice). Return JSON only with keys: subreddit, title, body.`
    );
    const obj = parseJSON(raw);
    if (obj?.subreddit) subreddit = obj.subreddit;
    if (obj?.title) title = obj.title;
    if (obj?.body) body = obj.body;
  }

  console.log('[reddit_video] Sub:', subreddit);
  console.log('[reddit_video] Title:', title);

  const useFont = fs.existsSync(path.join(__dirname, 'fonts', 'Poppins-Medium.ttf'));
  const fontPart = useFont ? `fontfile='${FONT}':` : '';

  const words = body.split(' ');
  const bodyLines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 40) { bodyLines.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) bodyLines.push(line.trim());

  const filters = [
    `drawtext=${fontPart}text='${esc(subreddit)}':fontsize=36:fontcolor=0x4FBCFF:x=80:y=500:borderw=1:bordercolor=black`,
    `drawtext=${fontPart}text='2.4k':fontsize=30:fontcolor=0xFF4500:x=80:y=560`,
    `drawtext=${fontPart}text='${esc(title)}':fontsize=50:fontcolor=white:x=80:y=640:borderw=2:bordercolor=black`,
  ];

  bodyLines.slice(0, 5).forEach((bl, i) => {
    filters.push(
      `drawtext=${fontPart}text='${esc(bl)}':fontsize=36:fontcolor=0xCCCCCC:x=80:y=${760 + i * 55}`
    );
  });

  const cardHeight = 300 + bodyLines.length * 55;
  const cardFilter = `drawbox=x=50:y=470:w=980:h=${cardHeight}:color=0x333333:t=2`;

  const bgVideo = await pickBgVideo(BG_VIDEO_DIR);

  let args;
  if (bgVideo) {
    const filterComplex = [
      '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p[bg]',
      `[bg]drawbox=x=0:y=0:w=1080:h=1920:color=black@0.5:t=fill,${cardFilter},${filters.join(',')}[out]`,
    ].join(';');

    args = ['-y', '-i', bgVideo, '-filter_complex', filterComplex, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-t', '12', OUTPUT];
    console.log('[reddit_video] Running FFmpeg (video background)...');
  } else {
    console.log('[reddit_video] No bg videos available, using color fallback');
    const filterChain = `${cardFilter},${filters.join(',')}`;
    args = ['-y', '-f', 'lavfi', '-i', 'color=c=0x1a1a1b:s=1080x1920:d=12:r=30', '-vf', filterChain, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '12', OUTPUT];
  }

  runFfmpeg(args);
  console.log('[reddit_video] Done:', OUTPUT);
}

main().catch((e) => {
  console.error('[reddit_video] Error:', e.message);
  process.exit(1);
});
