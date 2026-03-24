# ClipForge — Features Documentation

## Architecture Overview

ClipForge is a local-first AI video marketing engine. Users provide their website URL, the platform generates short-form videos using 4 different "engines", and users swipe through them (Tinder-style) to save the best ones to their library. Saved videos can be posted or scheduled to TikTok, Instagram, and YouTube.

**Tech Stack**: Next.js 16 + React 19 + Supabase (Auth + PostgreSQL) + Tailwind CSS 4 + Gemini AI + FFmpeg

---

## Authentication

**File**: `app/(auth)/auth/page.tsx`

- Email/password sign up and sign in
- Google OAuth (one-click)
- Session managed via Supabase `@supabase/ssr` cookies
- Middleware (`middleware.ts`) protects all routes — unauthenticated users redirect to `/auth`
- After sign in: users with existing brands → `/blitz`, new users → `/onboarding`

---

## Onboarding

**Files**: `app/onboarding/page.tsx`, `app/api/onboarding/route.ts`

4-step flow:
1. **Input**: User enters their brand/company website URL (no hardcoded default)
2. **Scraping**: Puppeteer scrapes the website, extracts visible text
3. **Brief**: Gemini AI generates a brand brief (name, description, audience, tone, features, tagline). User reviews it.
4. **Generating**: First batch of 4 videos fires off (one per engine). Polls job status every 3 seconds. Redirects to Blitz when done.

---

## Video Engines

**File**: `lib/engines/runner.ts` (spawns external scripts)

4 independent video engines, each producing a different style:

| Engine | Style | How it works |
|--------|-------|-------------|
| **Wall of Text** | Confessional/listicle TikTok | Gemini generates punchy copy → rendered as text over background video |
| **Hook + Demo** | Two-part hook + gameplay | 4-sec AI-generated hook → followed by product demo footage |
| **Green Screen Meme** | Viral meme format | AI-generated cinematic background (Imagen 4) + chroma-keyed meme overlay |
| **Reddit Video** | Reddit-style card reveal | Minecraft parkour background + Reddit card + karaoke TTS |

All engines use FFmpeg for video compositing and output 9:16 (vertical) MP4 files.

---

## Blitz (Swipe UI)

**File**: `app/blitz/page.tsx`

TikTok-style vertical card swiper:
- Cards show video with auto-play, engine badge, and caption
- **Drag right** (≥120px) = Save to library
- **Drag left** (≥120px) = Skip
- SAVE/SKIP stamp overlays with drag-based opacity
- **Proactive generation**: When ≤4 cards remain, auto-triggers background batch
- After each batch completes, immediately queues another (infinite rolling buffer)

---

## Library

**File**: `app/library/page.tsx`

Grid view of all saved videos:
- Filter by engine type (All / Wall of Text / Hook + Demo / Meme / Reddit)
- 9:16 thumbnails with hover play overlay
- Click to open video in modal with:
  - Video player
  - Download button
  - **Post / Schedule** button → opens posting modal

### Posting Modal
- Select platform (TikTok / Instagram / YouTube) — only connected ones are clickable
- Edit caption
- Toggle between **Post Now** and **Schedule**
- Schedule: pick date and time
- Posts immediately via `/api/post` or creates scheduled entry via `/api/schedule`

---

## Calendar (Scheduling)

**File**: `app/calendar/page.tsx`

Shows all scheduled and past posts:
- **Upcoming**: Scheduled posts with cancel button
- **History**: Posted / failed posts with status badges
- Each entry shows: thumbnail, platform badge, caption, date/time, status

### Processing Scheduled Posts
Endpoint: `GET /api/schedule/process`

This must be called periodically (e.g., every 5 minutes via cron). It:
1. Finds all posts where `status = 'scheduled'` and `scheduled_at ≤ now`
2. Refreshes OAuth tokens if near expiry
3. Uploads video to the platform
4. Updates status to `posted` or `error`

---

## Platform Connections

**File**: `app/connections/page.tsx`

Manage OAuth connections to social platforms:
- **TikTok**: Content Posting API (video upload, publish)
- **Instagram**: Graph API (Reels via media container)
- **YouTube**: Data API v3 (video upload as Shorts)

Each platform card shows:
- Connected status with username
- Connect button (initiates OAuth flow)
- Disconnect button

### OAuth Flow
1. `GET /api/platforms/connect?platform=tiktok` → redirects to platform OAuth
2. User authorizes → redirected to `/api/platforms/callback`
3. Callback exchanges code for tokens → stores in `platform_connections` table
4. Redirects back to `/connections?connected=tiktok`

---

## Analytics

**File**: `app/analytics/page.tsx`

Dashboard showing:
- Total videos generated / saved / skipped
- Save rate %
- Engine breakdown with progress bars
- Recent jobs list with status pills

---

## Database Schema (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `brands` | Website URLs and AI-generated brand briefs, per user |
| `videos` | Generated video files with metadata, swipe status |
| `jobs` | Generation job tracking (pending → running → done/error) |
| `platform_connections` | OAuth tokens for TikTok, Instagram, YouTube |
| `scheduled_posts` | Scheduled and completed social media posts |

All tables have `user_id` columns and Row Level Security (RLS) policies — users can only see their own data.

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/onboarding` | POST | Scrape URL + generate brand brief |
| `/api/onboarding` | GET | Get user's most recent brand |
| `/api/generate` | POST | Spawn video generation jobs |
| `/api/jobs` | GET | Poll job status |
| `/api/videos` | GET | Fetch videos (optionally unswiped only) |
| `/api/videos/[id]/swipe` | POST | Record save/skip action |
| `/api/library` | GET | Fetch saved videos |
| `/api/analytics` | GET | Aggregate stats |
| `/api/platforms` | GET | List connected platforms |
| `/api/platforms/connect` | GET | Initiate platform OAuth |
| `/api/platforms/callback` | GET | Handle OAuth callback |
| `/api/platforms/disconnect` | POST | Remove platform connection |
| `/api/post` | POST | Post video to platform immediately |
| `/api/schedule` | GET/POST/DELETE | CRUD for scheduled posts |
| `/api/schedule/process` | GET | Process due scheduled posts (cron) |
| `/api/auth/callback` | GET | Supabase auth callback |
