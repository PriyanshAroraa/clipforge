import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'db', 'clipforge.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    name TEXT,
    brief TEXT,
    raw_scrape TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL,
    engine TEXT NOT NULL,
    file_path TEXT,
    public_url TEXT,
    status TEXT NOT NULL DEFAULT 'generating',
    swipe_action TEXT,
    caption TEXT,
    thumbnail TEXT,
    duration_s REAL,
    file_size_mb REAL,
    error_msg TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    swiped_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL,
    engine TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    video_id INTEGER,
    error_msg TEXT,
    started_at INTEGER,
    finished_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    platform TEXT NOT NULL DEFAULT 'tiktok',
    scheduled_at INTEGER NOT NULL,
    caption TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

export default db;
