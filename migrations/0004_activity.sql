-- Anonymous activity feed for the footer: which entry got a vote, from which country (2-letter code), when. No IPs.
CREATE TABLE IF NOT EXISTS activity (key TEXT NOT NULL, country TEXT, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS activity_ts ON activity (ts);
