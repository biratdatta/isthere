-- Community submissions (Submit page) and ad booking requests (Advertise page).

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  directory TEXT NOT NULL,
  app TEXT NOT NULL,
  app_url TEXT,
  link TEXT NOT NULL,
  verdict TEXT NOT NULL,
  lose TEXT,
  install TEXT,
  github TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_status ON submissions (status, created_at);

CREATE TABLE IF NOT EXISTS ad_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot TEXT NOT NULL,
  week TEXT NOT NULL,
  company TEXT NOT NULL,
  url TEXT NOT NULL,
  email TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ad_requests_status ON ad_requests (status, created_at);
