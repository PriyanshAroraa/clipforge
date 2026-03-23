# ClipForge — AI Video Marketing Engine

> **TL;DR:** Paste your website URL. ClipForge scrapes it, builds a brand brief with AI, then continuously generates short-form marketing videos across 4 formats. You swipe to save the good ones to your library.

---

## What Is This?

ClipForge is a local-first AI video factory built for social media marketing. It's inspired by [Fastlane (app.usefastlane.ai)](https://app.usefastlane.ai) — the idea being that a brand can generate a near-infinite stream of TikTok/Instagram/YouTube Shorts content just by pointing the tool at their website.

The platform runs entirely on your machine. No cloud costs, no per-video fees — just your Gemini API key, FFmpeg, and a folder of background videos.

---

## Current Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind |
| Database | SQLite via `better-sqlite3` (local, WAL mode) |
| AI (copy) | Gemini 2.0 Flash (`gemini-2.0-flash-001`) |
| AI (images) | Imagen 4 (`imagen-4.0-fast-generate-001`) |
| Video | FFmpeg (local binary) |
| Scraping | Puppeteer (headless Chrome) |
| Audio | yt-dlp (downloads trending YouTube audio) |

---

## Features Built

### 1. Onboarding
- Enter any website URL
- Puppeteer scrapes the page (handles JS-rendered sites)
- Gemini reads the scraped content and produces a **brand brief**: name, description, key features, tagline, tone of voice
- Brief is saved to SQLite `brands` table
- Immediately kicks off first video generation batch

### 2. Four Video Engines

All engines are standalone Node.js `.mjs` scripts in `d:/newww/`. ClipForge spawns them as child processes and captures the output video path.

#### Wall of Text (`wall_of_text.mjs`)
- Confessional/listicle style — the "Did you know..." or "POV: you just..." format
- Gemini generates 6–8 lines of punchy copy based on brand brief
- Random background video from `bg_videos/` folder (MOV files)
- Trending audio downloaded from YouTube via yt-dlp
- Text rendered with Poppins Medium font, white with 3px stroke — matches Fastlane/TikTok style
- Per-line `drawtext` filters (FFmpeg doesn't support `\n`)
- Force `yuv420p` to fix 10-bit HDR MOV incompatibility

#### Hook + Demo (`hook_demo.mjs`)
- Two-part video: 4-second hook segment + full gameplay/demo video
- Hook: Gemini generates a punchy "wait", "no way", "bro" style opener (8–12 words)
- Hook segment uses a random background video with bold text overlay
- Demo segment: the actual product gameplay video (`a8655c5c...mp4`)
- Joined via FFmpeg concat demuxer

#### Green Screen Meme (`make_meme_video.mjs`)
- Takes a viral green screen meme from local catalog (`green_screen_memes/`)
- Chroma-keys out the green (`chromakey=color=0x00FF00:similarity=0.32:blend=0.06`)
- Composites the meme person over an AI-generated cinematic background (Imagen 4)
- Gemini generates a caption that ties the meme to the brand ("POV: you breed a champion on Owners Club...")
- Currently pinned to the "I Just Hit The Jackpot" meme (GameboyJones) — confirmed pure green screen

#### Reddit Video (`make_reddit_video.js`)
- Original engine from before ClipForge existed
- Minecraft parkour background + Reddit-style card PNG revealed with animation
- Karaoke-style TTS audio
- Card reveal uses FFmpeg `geq` alpha mask effect

### 3. Blitz (Swipe UI)
- TikTok-style vertical card stack
- Drag left = **Skip**, drag right = **Save** (120px threshold)
- SAVE/SKIP stamp overlays with opacity tied to drag distance
- Engine badge on each card (Wall of Text / Hook + Demo / etc.)
- Video autoplays, loops
- **Proactive generation**: when 4 cards remain in the queue, automatically triggers a new batch in the background — you should never hit an empty deck
- After each batch completes, immediately queues another — rolling infinite buffer

### 4. Library
- Grid of all saved videos (swipe action = "saved")
- Filter by engine type
- Click to open video in modal with Download button
- `aspect-[9/16]` thumbnails, hover play overlay

### 5. Analytics
- Total generated / saved / skipped counts
- Save rate %
- Engine breakdown with progress bars
- Recent jobs list with status pills (done / running / error)

### 6. Calendar *(placeholder)*
- UI shell exists, scheduling not yet implemented
- Intended for: schedule saved videos to TikTok, Instagram, YouTube Shorts

---

## File Structure

```
d:/newww/
├── wall_of_text.mjs          # Engine 1
├── hook_demo.mjs             # Engine 2
├── make_meme_video.mjs       # Engine 3
├── make_reddit_video.js      # Engine 4
├── get_meme_videos.mjs       # Script that downloaded green screen memes
├── bg_videos/                # Background MOV files (from Google Drive)
├── green_screen_memes/       # 12 memes + catalog.json
│   └── catalog.json          # Name, description, tags, file path per meme
├── fonts/
│   └── Poppins-Medium.ttf    # Font for text overlays
├── ai_bg.jpg                 # Imagen 4 generated background
└── clipforge/                # ← The Next.js platform (this repo)
    ├── app/
    │   ├── onboarding/       # Step 1: enter URL
    │   ├── blitz/            # Step 2: swipe videos
    │   ├── library/          # Saved videos grid
    │   ├── analytics/        # Stats dashboard
    │   ├── calendar/         # (placeholder)
    │   └── api/
    │       ├── onboarding/   # POST: scrape + brief
    │       ├── generate/     # POST: spawn all 4 engines
    │       ├── jobs/         # GET: poll job status
    │       ├── videos/       # GET: unswiped videos
    │       ├── videos/[id]/swipe/  # POST: save or skip
    │       ├── library/      # GET: saved videos
    │       └── analytics/    # GET: stats
    ├── db/
    │   └── index.ts          # SQLite singleton, 4 tables
    ├── lib/engines/
    │   └── runner.ts         # Spawns engine scripts, extracts thumbnails
    └── .env.local            # API keys + paths (not in git)
```

---

## Database Schema

```sql
brands          -- scraped brand briefs
  id, url, name, description, tagline, key_features, tone, created_at

videos          -- generated video files
  id, brand_id, engine, file_path, public_url, thumbnail,
  status, caption, swipe_action, file_size_mb, swiped_at

jobs            -- generation job tracking
  id, brand_id, engine, status, error_msg,
  created_at, started_at, finished_at, video_id

scheduled_posts -- (reserved for calendar feature)
  id, video_id, platform, scheduled_at, status
```

---

## Green Screen Meme Catalog

12 memes downloaded from creatorset.com via their Shopify API + Puppeteer network interception:

| Meme | Notes |
|------|-------|
| I Just Hit The Jackpot (GameboyJones) | ✅ Pure green — works perfectly |
| Spider-Man WAZZUP x2 | ⚠️ Blue/purple BG — needs different chroma key |
| The Rizzler | ✅ Green |
| Trump pointing | ✅ Green |
| Tung Tung Sahur | ✅ Green |
| Chopper Dancing | ✅ Green |
| + 6 more | See `green_screen_memes/catalog.json` |

---

## Environment Variables (`.env.local`)

```
GEMINI_KEY=           # Google Gemini API key
CHROME_PATH=          # Path to chrome.exe for Puppeteer
FFMPEG_PATH=          # Path to ffmpeg.exe
ENGINES_DIR=          # d:\newww (where .mjs engine files live)
OUTPUT_DIR=           # d:\newww\clipforge\public\videos
SITE_URL=             # Default brand URL for onboarding prefill
```

---

## What's Next (Not Built Yet)

| Feature | Notes |
|---------|-------|
| **Platform posting** | TikTok API, Instagram Graph API, YouTube Data API — post directly from Library/Calendar |
| **Calendar scheduling** | Pick a video, pick a date/time, pick a platform — queue it |
| **Slideshow engine** | Carousel-style video with multiple product screenshots |
| **Multi-brand support** | Currently assumes one brand — UI for switching brands |
| **More meme variety** | Fix chroma key for non-green backgrounds (blue/purple memes) |
| **Caption editing** | Edit AI-generated captions before saving |
| **Batch engine selection** | Choose which engines to run per batch |
| **Analytics over time** | Chart views/saves by day instead of all-time totals |

---

## How to Run

```bash
cd d:/newww/clipforge
npm run dev
# → http://localhost:3000/onboarding
```

Go to `/onboarding`, enter your website URL, and let it run.
