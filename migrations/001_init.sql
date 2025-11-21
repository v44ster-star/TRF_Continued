-- D1 (SQLite-compatible) migration: initial schema

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  price REAL,
  currency TEXT,
  image TEXT,
  rating REAL,
  reviews INTEGER,
  affiliate_url TEXT,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  site TEXT,
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  published_at TEXT,
  status TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  site TEXT,
  subscribed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  site TEXT,
  path TEXT,
  event TEXT,
  meta TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT,
  price REAL,
  currency TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS content_logs (
  id TEXT PRIMARY KEY,
  site TEXT,
  prompt TEXT,
  output_summary TEXT,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

COMMIT;
