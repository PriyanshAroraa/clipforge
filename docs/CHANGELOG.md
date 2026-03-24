# Changelog

## 2026-03-24 — Supabase Migration + Auth + Scheduling

### Added
- **Authentication**: Email/password + Google OAuth sign-in via Supabase
- **Middleware**: All routes protected — unauthenticated users redirect to `/auth`
- **Multi-tenant data isolation**: Every table has `user_id` + Row Level Security
- **Platform Connections page** (`/connections`): Connect/disconnect TikTok, Instagram, YouTube via OAuth
- **Post Now**: Instantly post a saved video to any connected platform from the Library
- **Schedule**: Schedule videos for future posting with date/time picker
- **Calendar page** (`/calendar`): View upcoming scheduled posts, past post history, cancel scheduled posts
- **Sidebar**: Added Connections nav item + Sign Out button
- **Supabase client helpers**: `utils/supabase/server.ts` (SSR) and `utils/supabase/client.ts` (browser)
- **Platform posting services**: `lib/platforms/tiktok.ts`, `instagram.ts`, `youtube.ts` — each handles OAuth token exchange, token refresh, and video upload
- **Schedule processor**: `GET /api/schedule/process` — cron endpoint that posts due scheduled videos
- **Documentation**: `docs/SETUP.md`, `docs/FEATURES.md`, `docs/CHANGELOG.md`

### Changed
- **Database**: Migrated from SQLite (better-sqlite3) → Supabase PostgreSQL
- **All API routes**: Replaced raw SQL with Supabase client queries + auth checks
- **Onboarding**: Removed hardcoded default URL — input starts blank
- **Blitz page**: Removed `localStorage.getItem('clipforge_brand_id')` — now fetches active brand from API
- **Library modal**: "Schedule" button replaced with full "Post / Schedule" modal with platform selection, caption editing, and date/time picker
- **IDs**: Changed from integer auto-increment to UUID (gen_random_uuid)

### Removed
- `db/index.ts` (SQLite database module)
- `SITE_URL` from `.env` (no longer needed — URL is entered dynamically in onboarding)
- `localStorage` usage for brand_id (replaced with API-based auth session)
- `better-sqlite3` dependency from `next.config.ts` serverExternalPackages
