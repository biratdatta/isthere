-- Initial schema for the D1 database (binding: DB).
-- Apply with: npx wrangler d1 migrations apply isthere --remote   (or --local for dev)

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- Vote counters, keyed "kind:slug" (e.g. "mcp:notion").
CREATE TABLE IF NOT EXISTS votes (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);

-- One row per vote: salted IP hash only, never the raw IP.
CREATE TABLE IF NOT EXISTS vote_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS vote_log_ip ON vote_log (ip_hash, slug, ts);
CREATE INDEX IF NOT EXISTS vote_log_ts ON vote_log (ts);

CREATE TABLE IF NOT EXISTS rate_events (key TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_events_key ON rate_events (key, ts);

CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY,
  source TEXT,
  created_at INTEGER NOT NULL
);

-- First-party, cookieless pageview counts.
CREATE TABLE IF NOT EXISTS hits (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  ref TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, ref)
);

CREATE TABLE IF NOT EXISTS favicons (
  domain TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  body BLOB NOT NULL,
  fetched_at INTEGER NOT NULL
);
