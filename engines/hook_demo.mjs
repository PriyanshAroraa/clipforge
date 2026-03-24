import { spawnSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { pickBgVideo } from './drive_bg.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUTPUT = process.env.CLIPFORGE_OUTPUT;
const SITE_URL = process.env.CLIPFORGE_SITE_URL || 'https://example.com';
const GEMINI_KEY = process.env.CLIPFORGE_GEMINI_KEY;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FONT = path.join(__dirname, 'fonts', 'Poppins-Medium.ttf').replace(/\\/g, '/').replace(/:/g, '\\:');
const BG_VIDEO_DIR = path.join(__dirname, 'bg_videos');
const HOOK_DURATION = 4;

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
  console.log('[hook_demo] Generating script for', SITE_URL);

  let hook = 'Wait... you need to see this';
  let pitch = 'This brand is changing the game. Here is why you should care.';

  if (GEMINI_KEY) {
    const raw = await callGemini(
      `Generate a 2-part TikTok script for this website: ${SITE_URL}. Part 1: A punchy hook (8-12 words, must start with "wait", "bro", or "no way"). Part 2: A product value pitch (2 short sentences). Return JSON only with keys: hook, pitch.`
    );
    const obj = parseJSON(raw);
    if (obj?.hook) hook = obj.hook;
    if (obj?.pitch) pitch = obj.pitch;
  }

  console.log('[hook_demo] Hook:', hook);
  console.log('[hook_demo] Pitch:', pitch);

  const useFont = fs.existsSync(path.join(__dirname, 'fonts', 'Poppins-Medium.ttf'));
  const fontPart = useFont ? `fontfile='${FONT}':` : '';

  const tmp = os.tmpdir();
  const runId = randomUUID().slice(0, 8);
  const part1 = path.join(tmp, `hook_part1_${runId}.mp4`);
  const part2 = path.join(tmp, `hook_part2_${runId}.mp4`);
  const concatFile = path.join(tmp, `hook_concat_${runId}.txt`);

  const bgVideo = await pickBgVideo(BG_VIDEO_DIR);

  // ── Part 1: Hook clip ──────────────────────────────────────────────────────
  const hookLines = wrapText(hook, 22);
  const hookFontSize = 58;
  const hookLineSpacing = 16;
  const hookStartY = `(h-${hookLines.length}*(${hookFontSize}+${hookLineSpacing}))/2`;

  const hookDrawtext = hookLines.map((line, i) => {
    const y = `${hookStartY}+${i}*(${hookFontSize}+${hookLineSpacing})`;
    return `drawtext=${fontPart}text='${esc(line)}':fontsize=${hookFontSize}:fontcolor=#FFFFFF:borderw=3:bordercolor=#000000:x=(w-text_w)/2:y=${y}`;
  }).join(',');

  if (bgVideo) {
    const fc = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,${hookDrawtext}[out]`;
    runFfmpeg(['-y', '-ss', '0', '-t', String(HOOK_DURATION), '-i', bgVideo, '-filter_complex', fc, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', part1]);
  } else {
    runFfmpeg(['-y', '-f', 'lavfi', '-i', `color=c=0xd35400:s=1080x1920:d=${HOOK_DURATION}:r=30`, '-vf', hookDrawtext, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', part1]);
  }

  // ── Part 2: Pitch clip ─────────────────────────────────────────────────────
  const mid = pitch.length > 60 ? pitch.indexOf('.', 30) + 1 || Math.floor(pitch.length / 2) : pitch.length;
  const line1 = esc(pitch.slice(0, mid).trim());
  const line2 = pitch.length > mid ? esc(pitch.slice(mid).trim()) : '';

  let pitchFilter = `drawtext=${fontPart}text='${line1}':fontsize=44:fontcolor=white:x=(w-text_w)/2:y=(h/2)-60:borderw=2:bordercolor=black`;
  if (line2) {
    pitchFilter += `,drawtext=${fontPart}text='${line2}':fontsize=44:fontcolor=white:x=(w-text_w)/2:y=(h/2)+40:borderw=2:bordercolor=black`;
  }

  if (bgVideo) {
    const fc = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,${pitchFilter}[out]`;
    runFfmpeg(['-y', '-ss', String(HOOK_DURATION), '-t', '6', '-i', bgVideo, '-filter_complex', fc, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', part2]);
  } else {
    runFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=0x0d0d0d:s=1080x1920:d=6:r=30', '-vf', pitchFilter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', part2]);
  }

  // ── Concat ─────────────────────────────────────────────────────────────────
  fs.writeFileSync(concatFile, `file '${part1.replace(/\\/g, '/')}'\nfile '${part2.replace(/\\/g, '/')}'`);
  runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', OUTPUT]);

  [part1, part2, concatFile].forEach(f => { try { fs.unlinkSync(f); } catch {} });
  console.log('[hook_demo] Done:', OUTPUT);
}

main().catch((e) => {
  console.error('[hook_demo] Error:', e.message);
  process.exit(1);
});
