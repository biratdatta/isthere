/**
 * Data layer on Cloudflare D1 (serverless SQLite). Only used by on-demand API routes;
 * pages are prerendered and fetch live numbers from /api/counts.
 * Schema lives in migrations/*.sql (apply with `wrangler d1 migrations apply`).
 */
import { env } from 'cloudflare:workers';
import { ENTRIES, keyOf, type Entry } from './apps';
import { KINDS, KIND_ORDER } from './kinds';
import schema1 from '../../migrations/0001_init.sql?raw';
import schema2 from '../../migrations/0002_submissions.sql?raw';
import schema3 from '../../migrations/0003_community.sql?raw';
import schema4 from '../../migrations/0004_activity.sql?raw';
import schema5 from '../../migrations/0005_presence.sql?raw';
import schema6 from '../../migrations/0006_geo.sql?raw';

const schemaSql = `${schema1};\n${schema2};\n${schema3};\n${schema4};\n${schema5};\n${schema6}`;

// Minimal D1 typings so this file doesn't depend on generated worker types.
interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
interface D1 {
  prepare(sql: string): D1Stmt;
  batch(stmts: D1Stmt[]): Promise<unknown[]>;
}

const raw = (): D1 => (env as unknown as { DB: D1 }).DB;

/**
 * The schema is created on first use (CREATE TABLE IF NOT EXISTS), once per Worker
 * instance, so a fresh D1 database works without a separate migration step.
 * migrations/*.sql hold the same schema, for `wrangler d1 migrations apply`.
 */
let ready: Promise<void> | undefined;
async function conn(): Promise<D1> {
  const d = raw();
  ready ??= d
    .batch(
      schemaSql
        .replace(/--.*$/gm, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => d.prepare(s))
    )
    .then(() => undefined)
    .catch((err) => {
      ready = undefined;
      throw err;
    });
  await ready;
  return d;
}
const now = () => Math.floor(Date.now() / 1000);

/* ---------- salt + ip hashing (raw IPs are never stored) ---------- */

let _salt: string | undefined;
async function salt(): Promise<string> {
  if (_salt) return _salt;
  const fresh = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await (await conn()).prepare('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)').bind('ip_salt', fresh).run();
  const row = await (await conn()).prepare('SELECT value FROM meta WHERE key = ?').bind('ip_salt').first<{ value: string }>();
  return (_salt = row!.value);
}

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode((await salt()) + ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/* ---------- generic rate limiting ---------- */

/** Returns true if the action is allowed (and records it). */
export async function rateLimit(key: string, windowSec: number, max: number): Promise<boolean> {
  const row = await (await conn())
    .prepare('SELECT COUNT(*) AS c FROM rate_events WHERE key = ? AND ts > ?')
    .bind(key, now() - windowSec)
    .first<{ c: number }>();
  if ((row?.c ?? 0) >= max) return false;
  const stmts = [(await conn()).prepare('INSERT INTO rate_events (key, ts) VALUES (?, ?)').bind(key, now())];
  if (Math.random() < 0.02) stmts.push((await conn()).prepare('DELETE FROM rate_events WHERE ts < ?').bind(now() - 86400 * 2));
  await (await conn()).batch(stmts);
  return true;
}

/* ---------- votes ---------- */

export async function voteCounts(): Promise<Map<string, number>> {
  const { results } = await (await conn()).prepare('SELECT slug, count FROM votes').all<{ slug: string; count: number }>();
  return new Map(results.map((r) => [r.slug, r.count]));
}

async function voteCount(key: string): Promise<number> {
  const row = await (await conn()).prepare('SELECT count FROM votes WHERE slug = ?').bind(key).first<{ count: number }>();
  return row?.count ?? 0;
}

export type VoteResult = { ok: true; count: number } | { ok: false; reason: 'already-voted' | 'rate-limited'; count: number };

const VOTE_COOLDOWN = 86400; // one vote per entry per IP per day
const VOTE_BURST = { windowSec: 3600, max: 20 }; // per IP across all entries

/** key is "kind:slug". */
export async function castVote(key: string, ipHash: string, country: string | null = null): Promise<VoteResult> {
  const recent = await (await conn())
    .prepare('SELECT 1 AS x FROM vote_log WHERE ip_hash = ? AND slug = ? AND ts > ? LIMIT 1')
    .bind(ipHash, key, now() - VOTE_COOLDOWN)
    .first();
  if (recent) return { ok: false, reason: 'already-voted', count: await voteCount(key) };
  if (!(await rateLimit(`vote:${ipHash}`, VOTE_BURST.windowSec, VOTE_BURST.max))) {
    return { ok: false, reason: 'rate-limited', count: await voteCount(key) };
  }
  await (await conn()).batch([
    (await conn()).prepare('INSERT INTO vote_log (slug, ip_hash, ts) VALUES (?, ?, ?)').bind(key, ipHash, now()),
    (await conn()).prepare('INSERT INTO votes (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1').bind(key),
    (await conn()).prepare('INSERT INTO activity (key, country, ts) VALUES (?, ?, ?)').bind(key, country && /^[A-Z]{2}$/.test(country) ? country : null, now()),
  ]);
  return { ok: true, count: await voteCount(key) };
}

export interface Totals {
  /** Σ price × votes over directories whose metric is "mrr". */
  mrr: number;
  mrr24h: number;
  votes: number;
  votes24h: number;
}

const emptyTotals = (): Totals => ({ mrr: 0, mrr24h: 0, votes: 0, votes24h: 0 });

/** Everything the prerendered pages need to show live numbers, in one round trip. */
export async function snapshot() {
  const [counts, recent] = await Promise.all([
    voteCounts(),
    (await conn())
      .prepare('SELECT slug, COUNT(*) AS n FROM vote_log WHERE ts > ? GROUP BY slug')
      .bind(now() - 86400)
      .all<{ slug: string; n: number }>()
      .then((r) => new Map(r.results.map((x) => [x.slug, x.n]))),
  ]);
  const totals: Record<string, Totals> = { all: emptyTotals() };
  for (const k of KIND_ORDER) totals[k] = emptyTotals();
  const add = (e: Entry, n: number, n24: number) => {
    const price = KINDS[e.kind].metric === 'mrr' ? e.priceMonthly ?? 0 : 0;
    for (const t of [totals.all, totals[e.kind]]) {
      t.votes += n;
      t.votes24h += n24;
      t.mrr += price * n;
      t.mrr24h += price * n24;
    }
  };
  for (const e of ENTRIES) add(e, counts.get(keyOf(e)) ?? 0, recent.get(keyOf(e)) ?? 0);
  for (const t of Object.values(totals)) {
    t.mrr = Math.round(t.mrr);
    t.mrr24h = Math.round(t.mrr24h);
  }
  const verdicts = await verdictCounts();
  return { counts: Object.fromEntries(counts), totals, verdicts };
}

/* ---------- agree / disagree with a verdict ---------- */

async function verdictCounts(): Promise<Record<string, [number, number]>> {
  const { results } = await (await conn()).prepare('SELECT key, agree, disagree FROM verdict_votes').all<{ key: string; agree: number; disagree: number }>();
  return Object.fromEntries(results.map((r) => [r.key, [r.agree, r.disagree] as [number, number]]));
}

export type VerdictResult = { ok: boolean; reason?: 'already-voted' | 'rate-limited'; agree: number; disagree: number };

export async function castVerdictVote(key: string, agree: boolean, ipHash: string): Promise<VerdictResult> {
  const d = await conn();
  const read = async () => (await d.prepare('SELECT agree, disagree FROM verdict_votes WHERE key = ?').bind(key).first<{ agree: number; disagree: number }>()) ?? { agree: 0, disagree: 0 };
  const recent = await d.prepare('SELECT 1 AS x FROM verdict_log WHERE ip_hash = ? AND key = ? AND ts > ? LIMIT 1').bind(ipHash, key, now() - 86400 * 30).first();
  if (recent) return { ok: false, reason: 'already-voted', ...(await read()) };
  if (!(await rateLimit(`verdict:${ipHash}`, 3600, 30))) return { ok: false, reason: 'rate-limited', ...(await read()) };
  const col = agree ? 'agree' : 'disagree';
  await d.batch([
    d.prepare('INSERT INTO verdict_log (key, ip_hash, agree, ts) VALUES (?, ?, ?, ?)').bind(key, ipHash, agree ? 1 : 0, now()),
    d.prepare(`INSERT INTO verdict_votes (key, ${col}) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET ${col} = ${col} + 1`).bind(key),
  ]);
  return { ok: true, ...(await read()) };
}

/* ---------- stats ---------- */

export async function stats() {
  const d = await conn();
  const since = (days: number) => now() - 86400 * days;
  const [snap, week, daily] = await Promise.all([
    snapshot(),
    d.prepare('SELECT slug, COUNT(*) AS n FROM vote_log WHERE ts > ? GROUP BY slug ORDER BY n DESC LIMIT 10').bind(since(7)).all<{ slug: string; n: number }>(),
    d
      .prepare("SELECT strftime('%Y-%m-%d', ts, 'unixepoch') AS day, COUNT(*) AS n FROM vote_log WHERE ts > ? GROUP BY day ORDER BY day")
      .bind(since(14))
      .all<{ day: string; n: number }>(),
  ]);
  const top = Object.entries(snap.counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, n]) => ({ key, n }));
  return { totals: snap.totals, top, week: week.results.map((r) => ({ key: r.slug, n: r.n })), daily: daily.results };
}

/* ---------- public review queue (no emails, no links: just what's waiting) ---------- */

export async function queue() {
  const { results } = await (await conn())
    .prepare('SELECT id, directory, app, github, status, created_at FROM submissions ORDER BY created_at DESC LIMIT 50')
    .all<{ id: number; directory: string; app: string; github: string | null; status: string; created_at: number }>();
  return results.map((r) => ({
    id: r.id,
    directory: r.directory,
    app: r.app,
    by: r.github ? r.github.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0].slice(0, 39) : null,
    status: r.status,
    created_at: r.created_at,
  }));
}

/* ---------- request an app ---------- */

export const requestSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export async function listRequests() {
  const { results } = await (await conn())
    .prepare("SELECT id, slug, name, directory, votes, status, created_at FROM app_requests WHERE status != 'hidden' ORDER BY status = 'done', votes DESC, created_at DESC LIMIT 100")
    .all<{ id: number; slug: string; name: string; directory: string | null; votes: number; status: string; created_at: number }>();
  return results;
}

export type RequestResult = { ok: boolean; reason?: 'already-voted' | 'rate-limited' | 'not-found'; id?: number; votes?: number };

/** Adds a request, or upvotes the existing one with the same normalized name. */
export async function requestApp(name: string, directory: string | null, ipHash: string): Promise<RequestResult> {
  const d = await conn();
  const slug = requestSlug(name);
  const existing = await d.prepare('SELECT id FROM app_requests WHERE slug = ?').bind(slug).first<{ id: number }>();
  if (existing) return upvoteRequest(existing.id, ipHash);
  if (!(await rateLimit(`request:new:${ipHash}`, 3600, 5))) return { ok: false, reason: 'rate-limited' };
  await d.prepare('INSERT INTO app_requests (slug, name, directory, created_at) VALUES (?, ?, ?, ?)').bind(slug, name, directory, now()).run();
  const row = await d.prepare('SELECT id, votes FROM app_requests WHERE slug = ?').bind(slug).first<{ id: number; votes: number }>();
  await d.prepare('INSERT INTO request_log (request_id, ip_hash, ts) VALUES (?, ?, ?)').bind(row!.id, ipHash, now()).run();
  return { ok: true, id: row!.id, votes: row!.votes };
}

export async function upvoteRequest(id: number, ipHash: string): Promise<RequestResult> {
  const d = await conn();
  const row = await d.prepare('SELECT id, votes FROM app_requests WHERE id = ?').bind(id).first<{ id: number; votes: number }>();
  if (!row) return { ok: false, reason: 'not-found' };
  const seen = await d.prepare('SELECT 1 AS x FROM request_log WHERE ip_hash = ? AND request_id = ? LIMIT 1').bind(ipHash, id).first();
  if (seen) return { ok: false, reason: 'already-voted', id, votes: row.votes };
  if (!(await rateLimit(`request:vote:${ipHash}`, 3600, 30))) return { ok: false, reason: 'rate-limited', id, votes: row.votes };
  await d.batch([
    d.prepare('INSERT INTO request_log (request_id, ip_hash, ts) VALUES (?, ?, ?)').bind(id, ipHash, now()),
    d.prepare('UPDATE app_requests SET votes = votes + 1 WHERE id = ?').bind(id),
  ]);
  return { ok: true, id, votes: row.votes + 1 };
}

/* ---------- waitlist ---------- */

export async function joinWaitlist(email: string, source: string): Promise<'added' | 'exists'> {
  const r = await (await conn())
    .prepare('INSERT OR IGNORE INTO waitlist (email, source, created_at) VALUES (?, ?, ?)')
    .bind(email, source.slice(0, 120), now())
    .run();
  return r.meta.changes > 0 ? 'added' : 'exists';
}

/* ---------- page counter ---------- */

export async function recordHit(pathname: string, ref: string) {
  const day = new Date().toISOString().slice(0, 10);
  await (await conn())
    .prepare('INSERT INTO hits (day, path, ref, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, path, ref) DO UPDATE SET n = n + 1')
    .bind(day, pathname.slice(0, 200), ref.slice(0, 120))
    .run();
}

/* ---------- favicon cache ---------- */

export async function getFavicon(domain: string) {
  const row = await (await conn())
    .prepare('SELECT mime, body, fetched_at FROM favicons WHERE domain = ?')
    .bind(domain)
    .first<{ mime: string; body: ArrayBuffer | number[]; fetched_at: number }>();
  if (!row) return undefined;
  const body = row.body instanceof ArrayBuffer ? new Uint8Array(row.body) : new Uint8Array(row.body ?? []);
  return { mime: row.mime, body, fetched_at: row.fetched_at };
}

export async function putFavicon(domain: string, mime: string, body: Uint8Array) {
  await (await conn())
    .prepare(
      'INSERT INTO favicons (domain, mime, body, fetched_at) VALUES (?, ?, ?, ?) ON CONFLICT(domain) DO UPDATE SET mime = excluded.mime, body = excluded.body, fetched_at = excluded.fetched_at'
    )
    .bind(domain, mime, body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), now())
    .run();
}

/* ---------- submissions + ad requests (reviewed by hand) ---------- */

export interface Submission {
  directory: string;
  app: string;
  appUrl: string;
  link: string;
  verdict: string;
  lose: string;
  install: string;
  github: string;
  email: string;
}

export async function addSubmission(x: Submission) {
  await (await conn())
    .prepare(
      'INSERT INTO submissions (directory, app, app_url, link, verdict, lose, install, github, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(x.directory, x.app, x.appUrl || null, x.link, x.verdict, x.lose || null, x.install || null, x.github || null, x.email || null, now())
    .run();
}

export interface AdRequest {
  slot: string;
  week: string;
  company: string;
  url: string;
  email: string;
  notes: string;
}

export async function addAdRequest(x: AdRequest) {
  await (await conn())
    .prepare('INSERT INTO ad_requests (slot, week, company, url, email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(x.slot, x.week, x.company, x.url, x.email, x.notes || null, now())
    .run();
}

/* ---------- suggested free alternatives (reviewed by hand) ---------- */

export async function addAltSuggestion(x: { app: string; name: string; url: string; description: string; github: string }) {
  await (await conn())
    .prepare('INSERT INTO alt_suggestions (app, name, url, description, github, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(x.app, x.name, x.url, x.description || null, x.github || null, now())
    .run();
}

/* ---------- footer pulse: live totals, this week's hottest app, recent activity ---------- */

export async function pulse() {
  const d = await conn();
  const [snap, hot, recent] = await Promise.all([
    snapshot(),
    d.prepare('SELECT slug, COUNT(*) AS n FROM vote_log WHERE ts > ? GROUP BY slug ORDER BY n DESC LIMIT 1').bind(now() - 86400 * 7).first<{ slug: string; n: number }>(),
    d.prepare('SELECT key, country, ts FROM activity ORDER BY ts DESC LIMIT 8').all<{ key: string; country: string | null; ts: number }>(),
  ]);
  if (Math.random() < 0.02) await d.prepare('DELETE FROM activity WHERE ts < ?').bind(now() - 86400 * 30).run();
  return {
    mrr: snap.totals.all.mrr,
    votes: snap.totals.all.votes,
    counts: snap.counts,
    hot: hot ? { key: hot.slug, n: hot.n } : null,
    recent: recent.results.map((r) => ({ key: r.key, c: r.country, ts: r.ts })),
    now: now(),
  };
}

/* ---------- live counters: people online, visits, per-page views ---------- */

const ONLINE_WINDOW = 120; // seconds since last heartbeat

const cc = (c: string | null | undefined) => (c && /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : null);

export async function touchPresence(sid: string, country: string | null = null) {
  const d = await conn();
  const stmts = [d.prepare('INSERT INTO online (sid, country, ts) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET ts = excluded.ts, country = COALESCE(excluded.country, online.country)').bind(sid, cc(country), now())];
  if (Math.random() < 0.05) stmts.push(d.prepare('DELETE FROM online WHERE ts < ?').bind(now() - 600));
  await d.batch(stmts);
}

export async function recordVisitCountry(country: string | null) {
  const c = cc(country);
  if (!c) return;
  await (await conn())
    .prepare('INSERT INTO visits_geo (day, country, n) VALUES (?, ?, 1) ON CONFLICT(day, country) DO UPDATE SET n = n + 1')
    .bind(new Date().toISOString().slice(0, 10), c)
    .run();
}

export async function onlineNow(): Promise<number> {
  const row = await (await conn()).prepare('SELECT COUNT(*) AS n FROM online WHERE ts > ?').bind(now() - ONLINE_WINDOW).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function live(path: string | null) {
  const d = await conn();
  const today = new Date().toISOString().slice(0, 10);
  const [online, visits, votesToday, views, snap, geoOnline, geoToday] = await Promise.all([
    onlineNow(),
    d.prepare('SELECT COALESCE(SUM(n), 0) AS total, COALESCE(SUM(CASE WHEN day = ? THEN n END), 0) AS today FROM hits').bind(today).first<{ total: number; today: number }>(),
    d.prepare('SELECT COUNT(*) AS n FROM vote_log WHERE ts > ?').bind(now() - 86400).first<{ n: number }>(),
    path ? d.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM hits WHERE path = ?').bind(path).first<{ n: number }>() : Promise.resolve(null),
    snapshot(),
    d.prepare('SELECT country AS c, COUNT(*) AS n FROM online WHERE ts > ? AND country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 60').bind(now() - ONLINE_WINDOW).all<{ c: string; n: number }>(),
    d.prepare('SELECT country AS c, n FROM visits_geo WHERE day = ? ORDER BY n DESC LIMIT 120').bind(today).all<{ c: string; n: number }>(),
  ]);
  return {
    geo: { online: geoOnline.results, today: geoToday.results },
    online: Math.max(1, online),
    visitsToday: visits?.today ?? 0,
    visitsTotal: visits?.total ?? 0,
    votesToday: votesToday?.n ?? 0,
    votesTotal: snap.totals.all.votes,
    mrr: snap.totals.all.mrr,
    views: views?.n ?? 0,
  };
}
