-- Country-level live map: who's online (per tab, with the 2-letter country Cloudflare reports) and visits per country per day. No IPs.
CREATE TABLE IF NOT EXISTS online (sid TEXT PRIMARY KEY, country TEXT, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS online_ts ON online (ts);
CREATE TABLE IF NOT EXISTS visits_geo (day TEXT NOT NULL, country TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, country));
