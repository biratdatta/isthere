-- "People on the site right now": one row per browser tab session (random id from sessionStorage), last seen time. No IPs, no cookies.
CREATE TABLE IF NOT EXISTS presence (sid TEXT PRIMARY KEY, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS presence_ts ON presence (ts);
