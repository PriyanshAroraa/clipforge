import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_DIR = path.join(os.tmpdir(), 'clipforge_bg_cache');

/**
 * Fetch a random background video from Google Drive folder.
 * Falls back to local engines/bg_videos/ if Drive is unavailable.
 *
 * Requires:
 *  - DRIVE_BG_FOLDER_ID env var (Google Drive folder ID)
 *  - CLIPFORGE_GEMINI_KEY env var (Google API key — must have Drive API enabled)
 *
 * The folder must be shared as "Anyone with the link can view".
 */

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'ClipForge/1.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`)));
        return;
      }
      resolve(res);
    }).on('error', reject);
  });
}

function httpsGetJSON(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await httpsGet(url);
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse failed: ' + data.slice(0, 200))); }
      });
    } catch (e) { reject(e); }
  });
}

function downloadFile(url, dest) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await httpsGet(url);
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(dest); });
      ws.on('error', reject);
    } catch (e) { reject(e); }
  });
}

/**
 * List video files in the Google Drive folder.
 */
async function listDriveVideos(folderId, apiKey) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&key=${apiKey}`;

  const data = await httpsGetJSON(url);
  if (data.error) {
    throw new Error(`Drive API error: ${data.error.message}`);
  }

  const videoExts = ['.mp4', '.mov', '.MP4', '.MOV'];
  const videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

  return (data.files || []).filter(f =>
    videoMimes.includes(f.mimeType) ||
    videoExts.some(e => f.name?.endsWith(e))
  );
}

/**
 * Download a Drive file to cache, returning the local path.
 * Caches by file ID so repeated runs reuse the same file.
 */
async function downloadDriveVideo(fileId, fileName, apiKey) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const ext = path.extname(fileName) || '.mp4';
  const cached = path.join(CACHE_DIR, `${fileId}${ext}`);

  // Use cached version if it exists and is non-empty
  if (fs.existsSync(cached) && fs.statSync(cached).size > 0) {
    console.log(`[drive_bg] Using cached: ${fileName}`);
    return cached;
  }

  console.log(`[drive_bg] Downloading: ${fileName}...`);
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

  await downloadFile(url, cached);

  const size = (fs.statSync(cached).size / 1024 / 1024).toFixed(1);
  console.log(`[drive_bg] Downloaded: ${fileName} (${size} MB)`);
  return cached;
}

/**
 * Pick a random background video from local bg_videos/ or Google Drive.
 * Returns the file path (local or temp-cached), or null if none available.
 *
 * @param {string} localDir - Path to local bg_videos/ directory
 * @returns {Promise<string|null>} Path to video file, or null
 */
export async function pickBgVideo(localDir) {
  // 1. Check local bg_videos/ first
  const exts = ['.mov', '.mp4', '.MOV', '.MP4'];
  if (localDir && fs.existsSync(localDir)) {
    const localFiles = fs.readdirSync(localDir)
      .filter(f => exts.some(e => f.endsWith(e)))
      .map(f => path.join(localDir, f).replace(/\\/g, '/'));
    if (localFiles.length > 0) {
      const pick = localFiles[Math.floor(Math.random() * localFiles.length)];
      console.log(`[drive_bg] Using local bg video: ${pick}`);
      return pick;
    }
  }

  // 2. Try Google Drive
  const folderId = process.env.DRIVE_BG_FOLDER_ID;
  const apiKey = process.env.CLIPFORGE_GEMINI_KEY;

  if (!folderId || !apiKey) {
    console.log('[drive_bg] No DRIVE_BG_FOLDER_ID or API key, skipping Drive');
    return null;
  }

  try {
    const videos = await listDriveVideos(folderId, apiKey);
    if (videos.length === 0) {
      console.log('[drive_bg] No videos found in Drive folder');
      return null;
    }

    const pick = videos[Math.floor(Math.random() * videos.length)];
    console.log(`[drive_bg] Picked from Drive: ${pick.name}`);

    const localPath = await downloadDriveVideo(pick.id, pick.name, apiKey);
    return localPath.replace(/\\/g, '/');
  } catch (e) {
    console.error(`[drive_bg] Drive fetch failed: ${e.message}`);
    console.log('[drive_bg] Tip: Make sure the Drive folder is shared as "Anyone with the link" and Drive API is enabled for your Google Cloud project');
    return null;
  }
}
