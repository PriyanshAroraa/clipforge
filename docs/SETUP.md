# ClipForge — Setup Guide

## Prerequisites

- Node.js 18+
- Google Chrome installed (for Puppeteer web scraping)
- FFmpeg installed and in PATH
- Supabase project (free tier works)
- Google Gemini API key

## 1. Install Dependencies

```bash
npm install
```

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```
# AI
GEMINI_KEY=your-gemini-api-key

# Tools
CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
FFMPEG_PATH=C:\\ffmpeg\\bin\\ffmpeg.exe

# Video engine paths (inside this project)
ENGINES_DIR=C:\\path\\to\\clipforge\\engines
OUTPUT_DIR=C:\\path\\to\\clipforge\\public\\videos

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # needed for scheduled post processing

# Platform APIs (optional — only needed for posting)
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# For Instagram posting (needs public URL for video upload)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 3. Database Setup

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Core tables
create table brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  url text not null,
  name text,
  brief jsonb,
  raw_scrape text,
  created_at timestamptz default now()
);

create table videos (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands not null,
  user_id uuid references auth.users not null,
  engine text not null,
  file_path text,
  public_url text,
  status text default 'generating',
  swipe_action text,
  caption text,
  thumbnail text,
  duration_s float,
  file_size_mb float,
  error_msg text,
  created_at timestamptz default now(),
  swiped_at timestamptz
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands not null,
  user_id uuid references auth.users not null,
  engine text not null,
  status text default 'pending',
  video_id uuid references videos,
  error_msg text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- Platform connections (OAuth tokens for TikTok, Instagram, YouTube)
create table platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  platform text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  platform_user_id text,
  platform_username text,
  created_at timestamptz default now(),
  unique(user_id, platform)
);

-- Scheduled posts
create table scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  video_id uuid references videos not null,
  platform text not null,
  scheduled_at timestamptz not null,
  caption text,
  status text default 'scheduled',
  posted_at timestamptz,
  platform_post_id text,
  error_msg text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table brands enable row level security;
alter table videos enable row level security;
alter table jobs enable row level security;
alter table platform_connections enable row level security;
alter table scheduled_posts enable row level security;

create policy "users own their brands" on brands for all using (auth.uid() = user_id);
create policy "users own their videos" on videos for all using (auth.uid() = user_id);
create policy "users own their jobs" on jobs for all using (auth.uid() = user_id);
create policy "users own their connections" on platform_connections for all using (auth.uid() = user_id);
create policy "users own their scheduled posts" on scheduled_posts for all using (auth.uid() = user_id);
```

## 4. Supabase Auth Setup

### Email/Password
Enabled by default — no extra config needed.

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID (Web application)
3. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret
5. In Supabase Dashboard → Authentication → Providers → Google → Enable and paste credentials

### Redirect URLs
In Supabase → Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (or production URL)
- Redirect URLs: `http://localhost:3000/api/auth/callback`

## 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/auth` to sign in.

## 6. Platform API Setup (Optional)

### TikTok
1. Register at [TikTok for Developers](https://developers.tiktok.com/)
2. Create app → enable "Content Posting API"
3. Add redirect URI: `http://localhost:3000/api/platforms/callback`
4. Copy Client Key and Secret to `.env`

### Instagram
1. Register at [Meta for Developers](https://developers.facebook.com/)
2. Create app → add "Instagram Graph API" product
3. You need a Facebook Page linked to an Instagram Business Account
4. Add redirect URI: `http://localhost:3000/api/platforms/callback`
5. Copy App ID and Secret to `.env`

### YouTube
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `http://localhost:3000/api/platforms/callback`
5. Copy Client ID and Secret to `.env`

## 7. Scheduled Post Processing

Scheduled posts need a cron job to process them. Call this endpoint periodically:

```
GET /api/schedule/process
```

Options:
- **Vercel Cron**: Add to `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/schedule/process", "schedule": "*/5 * * * *" }] }
  ```
- **External cron**: Use any cron service to hit the endpoint every 5 minutes
- **Supabase pg_cron**: Call the endpoint via `pg_net` extension
