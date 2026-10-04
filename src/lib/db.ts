import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ENTRIES, keyOf, type Entry } from './apps';
import { KINDS } from './kinds';

const DB_PATH = process.env.DB_PATH || path.resolve('data/db/site.sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS votes (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
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
`;

let _db: Database.Database | undefined;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 3000');
  _db.exec(SCHEMA);
  migrate(_db);
  return _db;
}

/** v2: votes are keyed "kind:slug" (four directories). Old keys were bare prompt slugs. */
function migrate(d: Database.Database) {
  const row = d.prepare("SELECT value FROM meta WHERE key = 'schema'").get() as { value: string } | undefined;
  if (Number(row?.value ?? 1) >= 2) return;
  d.transaction(() => {
    d.prepare("UPDATE votes SET slug = 'prompts:' || slug WHERE instr(slug, ':') = 0").run();
    d.prepare("UPDATE vote_log SET slug = 'prompts:' || slug WHERE instr(slug, ':') = 0").run();
    d.prepare("INSERT INTO meta (key, value) VALUES ('schema', '2') ON CONFLICT(key) DO UPDATE SET value = '2'").run();
  })();
}

const now = () => Math.floor(Date.now() / 1000);

/* ---------- salt + ip hashing (raw IPs are never stored) ---------- */

let _salt: string | undefined;
export function salt(): string {
  if (_salt) return _salt;
  const row = db().prepare('SELECT value FROM meta WHERE key = ?').get('ip_salt') as { value: string } | undefined;
  if (row) return (_salt = row.value);
  const fresh = crypto.randomBytes(32).toString('hex');
  db().prepare('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)').run('ip_salt', fresh);
  return (_salt = (db().prepare('SELECT value FROM meta WHERE key = ?').get('ip_salt') as { value: string }).value);
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(salt() + ip).digest('hex').slice(0, 32);
}

/* ---------- generic rate limiting ---------- */

/** Returns true if the action is allowed (and records it). */
export function rateLimit(key: string, windowSec: number, max: number): boolean {
  const d = db();
  const since = now() - windowSec;
  const { c } = d.prepare('SELECT COUNT(*) AS c FROM rate_events WHERE key = ? AND ts > ?').get(key, since) as { c: number };
  if (c >= max) return false;
  d.prepare('INSERT INTO rate_events (key, ts) VALUES (?, ?)').run(key, now());
  if (Math.random() < 0.02) d.prepare('DELETE FROM rate_events WHERE ts < ?').run(now() - 86400 * 2);
  return true;
}

/* ---------- votes ---------- */

export function voteCounts(): Map<string, number> {
  const rows = db().prepare('SELECT slug, count FROM votes').all() as { slug: string; count: number }[];
  return new Map(rows.map((r) => [r.slug, r.count]));
}

export function voteCount(slug: string): number {
  const row = db().prepare('SELECT count FROM votes WHERE slug = ?').get(slug) as { count: number } | undefined;
  return row?.count ?? 0;
}

export type VoteResult =
  | { ok: true; count: number }
  | { ok: false; reason: 'already-voted' | 'rate-limited'; count: number };

const VOTE_COOLDOWN = 86400; // one vote per app per IP per day
const VOTE_BURST = { windowSec: 3600, max: 20 }; // per IP across all apps

export function castVote(slug: string, ipHash: string): VoteResult {
  const d = db();
  const tx = d.transaction((): VoteResult => {
    const recent = d
      .prepare('SELECT 1 FROM vote_log WHERE ip_hash = ? AND slug = ? AND ts > ? LIMIT 1')
      .get(ipHash, slug, now() - VOTE_COOLDOWN);
    if (recent) return { ok: false, reason: 'already-voted', count: voteCount(slug) };
    if (!rateLimit(`vote:${ipHash}`, VOTE_BURST.windowSec, VOTE_BURST.max)) {
      return { ok: false, reason: 'rate-limited', count: voteCount(slug) };
    }
    d.prepare('INSERT INTO vote_log (slug, ip_hash, ts) VALUES (?, ?, ?)').run(slug, ipHash, now());
    d.prepare('INSERT INTO votes (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1').run(slug);
    return { ok: true, count: voteCount(slug) };
  });
  return tx();
}

export interface Totals {
  /** Σ price × votes over directories whose metric is "mrr". */
  mrr: number;
  mrr24h: number;
  /** All votes in scope. */
  votes: number;
  votes24h: number;
}

/** Totals over a set of entries (one directory, or everything). Keys are "kind:slug". */
export function totals(entries: Entry[] = ENTRIES, counts = voteCounts()): Totals {
  const scope = new Map(entries.map((e) => [keyOf(e), e]));
  const mrrPrice = (e: Entry | undefined) => (e && KINDS[e.kind].metric === 'mrr' ? e.priceMonthly ?? 0 : 0);
  let mrr = 0;
  let votes = 0;
  for (const [key, n] of counts) {
    const e = scope.get(key);
    if (!e) continue;
    mrr += mrrPrice(e) * n;
    votes += n;
  }
  const recent = db()
    .prepare('SELECT slug, COUNT(*) AS n FROM vote_log WHERE ts > ? GROUP BY slug')
    .all(now() - 86400) as { slug: string; n: number }[];
  let mrr24h = 0;
  let votes24h = 0;
  for (const r of recent) {
    const e = scope.get(r.slug);
    if (!e) continue;
    mrr24h += mrrPrice(e) * r.n;
    votes24h += r.n;
  }
  return { mrr: Math.round(mrr), votes, mrr24h: Math.round(mrr24h), votes24h };
}

/* ---------- waitlist ---------- */

export function joinWaitlist(email: string, source: string): 'added' | 'exists' {
  const r = db()
    .prepare('INSERT OR IGNORE INTO waitlist (email, source, created_at) VALUES (?, ?, ?)')
    .run(email, source.slice(0, 120), now());
  return r.changes > 0 ? 'added' : 'exists';
}

/* ---------- first-party analytics (no cookies, no IPs) ---------- */

export function recordHit(pathname: string, ref: string) {
  const day = new Date().toISOString().slice(0, 10);
  db()
    .prepare('INSERT INTO hits (day, path, ref, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, path, ref) DO UPDATE SET n = n + 1')
    .run(day, pathname.slice(0, 200), ref.slice(0, 120));
}

/* ---------- favicon cache ---------- */

export function getFavicon(domain: string) {
  return db().prepare('SELECT mime, body, fetched_at FROM favicons WHERE domain = ?').get(domain) as
    | { mime: string; body: Buffer; fetched_at: number }
    | undefined;
}

export function putFavicon(domain: string, mime: string, body: Buffer) {
  db()
    .prepare('INSERT INTO favicons (domain, mime, body, fetched_at) VALUES (?, ?, ?, ?) ON CONFLICT(domain) DO UPDATE SET mime = excluded.mime, body = excluded.body, fetched_at = excluded.fetched_at')
    .run(domain, mime, body, now());
}
