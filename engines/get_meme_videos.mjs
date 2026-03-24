import puppeteer from 'puppeteer';
import { spawnSync } from 'child_process';
import fs from 'fs';
import https from 'https';

const CHROME  = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const YTDLP   = 'C:\\Users\\priya\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe';
const OUT_DIR = 'd:/newww/green_screen_memes';
const LIMIT   = 12;

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── 1. Fetch product list from Shopify API ────────────────────────────────────
console.log('Fetching product list from Shopify API...');
const res = await fetch(`https://creatorset-shop.myshopify.com/collections/free-green-screens/products.json?limit=${LIMIT}`);
const { products } = await res.json();
console.log(`Found ${products.length} products`);

// ── 2. For each product, visit the page and intercept the video URL ───────────
const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const catalog = [];

for (const product of products) {
  const productUrl = `https://creatorset.com/products/${product.handle}`;
  console.log(`\nProcessing: ${product.title}`);

  const page = await browser.newPage();
  const videoUrls = [];

  // Intercept ALL responses to catch video files
  page.on('response', async (response) => {
    const url = response.url();
    const ct  = response.headers()['content-type'] || '';
    if (url.match(/\.(mp4|mov|webm)/i) || ct.includes('video')) {
      videoUrls.push(url);
    }
  });

  try {
    await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to trigger lazy loads
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await new Promise(r => setTimeout(r, 1500));

    // Try clicking any play/download button
    await page.evaluate(() => {
      const btn = document.querySelector('button[class*="play"], [class*="download"], video');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Also look in page source for CDN video links
    const pageSource = await page.content();
    const cdnMatches = pageSource.match(/https:\/\/cdn\.shopify\.com[^"'\s]+\.mp4/gi) || [];
    videoUrls.push(...cdnMatches);

    // Check for direct download links
    const dlLinks = await page.evaluate(() =>
      [...document.querySelectorAll('a')]
        .filter(a => a.href?.match(/\.(mp4|mov|webm)/i) || a.innerText?.match(/^download$/i))
        .map(a => a.href)
    );
    videoUrls.push(...dlLinks);

  } catch(e) {
    console.log(`  Page error: ${e.message}`);
  }

  await page.close();

  const uniqueVideos = [...new Set(videoUrls.filter(Boolean))];
  console.log(`  Found ${uniqueVideos.length} video URLs:`, uniqueVideos);

  if (uniqueVideos.length === 0) {
    console.log('  No video found, skipping');
    continue;
  }

  const videoUrl = uniqueVideos[0];
  const safeName = product.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 50);
  const outPath  = `${OUT_DIR}/${safeName}.mp4`;

  if (fs.existsSync(outPath)) {
    console.log(`  Already exists: ${safeName}`);
  } else {
    // Try yt-dlp
    let r = spawnSync(YTDLP, ['-o', outPath, '--no-playlist', videoUrl], { encoding: 'utf8' });
    if (r.status !== 0) {
      // Direct download
      r = spawnSync('curl', ['-L', '-o', outPath, videoUrl], { encoding: 'utf8' });
    }
    if (r.status === 0 && fs.existsSync(outPath)) {
      console.log(`  ✓ Downloaded: ${safeName}`);
    } else {
      console.log(`  ✗ Download failed`);
      continue;
    }
  }

  // Clean description
  const desc = product.body_html.replace(/<[^>]+>/g, '').trim().slice(0, 300);

  catalog.push({
    file: outPath,
    name: product.title,
    description: desc,
    tags: product.tags,
    handle: product.handle,
  });
}

await browser.close();

// ── 3. Save catalog ───────────────────────────────────────────────────────────
const catalogPath = `${OUT_DIR}/catalog.json`;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log(`\n✓ Catalog saved: ${catalogPath}`);
console.log(`✓ Total downloaded: ${catalog.length} memes`);
catalog.forEach(m => console.log(`  • ${m.name}`));
