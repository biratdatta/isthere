-- Community features: agree/disagree on verdicts, and the "request an app" board.

-- Verdict agreement per entry, keyed "kind:slug".
CREATE TABLE IF NOT EXISTS verdict_votes (key TEXT PRIMARY KEY, agree INTEGER NOT NULL DEFAULT 0, disagree INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS verdict_log (key TEXT NOT NULL, ip_hash TEXT NOT NULL, agree INTEGER NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS verdict_log_ip ON verdict_log (ip_hash, key, ts);

-- Apps people want checked next. slug is the normalized name, so "Notion" and "notion" are one request.
CREATE TABLE IF NOT EXISTS app_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  directory TEXT,
  votes INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS app_requests_votes ON app_requests (status, votes);
CREATE TABLE IF NOT EXISTS request_log (request_id INTEGER NOT NULL, ip_hash TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS request_log_ip ON request_log (ip_hash, request_id);
