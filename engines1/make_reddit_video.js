const { spawnSync } = require('child_process');
const fs = require('fs');

const FFMPEG = 'C:\\Users\\priya\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';
const FONT = 'C\\:/Windows/Fonts/segoeuib.ttf';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const totalDuration = 30.604;
const bgStartAt     = 60;

// Reddit card: 1200x838px screenshot, scaled to 1000px wide
const CARD_SCALE_W = 1000;
const CARD_SCALE_H = Math.round(838 * (1000 / 1200)); // 698px
const CARD_X       = 40;
const CARD_Y       = 220;
const R            = 20; // reveal full card in 20 seconds

// ── KARAOKE CHUNKS ────────────────────────────────────────────────────────────
const bodyText = "I have played a bunch of Web3 games for a while but I ended up playing Owners Club most of the time. What surprised me is that it got me interested in real horse racing. In the game you can train and manage your own horses and the strategy side ended up being more fun than I expected. What hooked me was the racing and the competitions. Because of that I ended up checking out real races for the first time and honestly its been pretty cool so far.";
const words      = bodyText.split(' ');
const secPerWord = totalDuration / (words.length + 6);
const titleTime  = 6 * secPerWord;
const CHUNK      = 5;

const kChunks = [];
for (let i = 0; i < words.length; i += CHUNK) {
  const w    = words.slice(i, i + CHUNK);
  const t    = titleTime + i * secPerWord;
  const safe = w.join(' ').replace(/[:'"\[\]{}\\]/g, '').trim();
  kChunks.push({ text: safe, t: parseFloat(t.toFixed(3)) });
}

// ── FILTER COMPLEX ────────────────────────────────────────────────────────────
//
// Inputs:
//   0:v  Minecraft background video
//   1:v  Reddit card PNG (static image, looped)
//   2:a  TTS audio
//
// Pipeline:
//   1. Scale Minecraft to 1080x1920 portrait with black padding        → [bg]
//   2. Scale card to 1000x698, convert RGBA, apply geq alpha mask      → [card_reveal]
//      geq sets alpha=255 for pixels above the reveal line (Y < H*T/R)
//      and alpha=0 below — so Minecraft shows through the unrevealed area
//   3. Overlay transparent card onto Minecraft                          → [base]
//   4. Add karaoke text + watermark                                    → [out]

// Scale to fill full 1080x1920 (crop center — no black bars)
const bgVf = [
  'scale=1080:1920:force_original_aspect_ratio=increase',
  'crop=1080:1920',
].join(',') + '[bg]';

const cardVf = [
  `scale=${CARD_SCALE_W}:${CARD_SCALE_H}`,
  'format=rgba',
  // geq: per-pixel per-frame — visible (a=255) when row Y < H*T/R, else transparent (a=0)
  `geq=r='r(X\\,Y)':g='g(X\\,Y)':b='b(X\\,Y)':a='if(lt(Y\\,H*T/${R})\\,255\\,0)'`,
].join(',') + '[card_reveal]';

const overlayVf = `[bg][card_reveal]overlay=${CARD_X}:${CARD_Y}[base]`;

const karaokeFilters = kChunks.map(c =>
  `drawtext=fontfile='${FONT}':text='${c.text}':fontsize=46:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=100:enable='between(t,${c.t},${c.t + CHUNK * secPerWord + 0.1})'`
).join(',');

const watermark = `drawtext=fontfile='${FONT}':text='Owners Club':fontsize=34:fontcolor=white@0.7:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-65`;

const finalVf = `[base]${karaokeFilters},${watermark}[out]`;

const filterComplex = [bgVf, cardVf, overlayVf, finalVf].join(';');

// ── BUILD ─────────────────────────────────────────────────────────────────────
const bg         = 'd:/newww/Chill Minecraft Hypixel parkour gameplay for commentary! (free to use) - ItsIpsn (720p, h264, youtube).mp4';
const screenshot = 'd:/newww/reddit_screenshot.png';
const audio      = 'd:/newww/tts_eleven.mp3';
const output     = 'd:/newww/reddit_eleven_test.mp4';

console.log('Building Reddit Minecraft video...');
console.log(`  Card: ${CARD_SCALE_W}x${CARD_SCALE_H}, reveals over ${R}s via geq alpha`);
console.log(`  ${kChunks.length} karaoke chunks`);

const args = [
  '-y',
  '-ss',    String(bgStartAt),
  '-i',     bg,
  '-loop',  '1', '-i', screenshot,
  '-i',     audio,
  '-t',     String(totalDuration),
  '-filter_complex', filterComplex,
  '-map',   '[out]',
  '-map',   '2:a',
  '-c:v',   'libx264',
  '-preset','fast',
  '-c:a',   'aac',
  '-shortest',
  output
];

const result = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });

if (result.status !== 0) {
  console.error('FFmpeg failed:');
  console.error(result.stderr ? result.stderr.slice(-3000) : 'no stderr');
} else {
  const size = (fs.statSync(output).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${output} (${size} MB)`);
}
