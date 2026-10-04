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

const schemaSql = `${schema1};\n${schema2}`;

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
export async function castVote(key: string, ipHash: string): Promise<VoteResult> {
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
  return { counts: Object.fromEntries(counts), totals };
}

/* ---------- waitlist ---------- */

export async function joinWaitlist(email: string, source: string): Promise<'added' | 'exists'> {
  const r = await (await conn())
    .prepare('INSERT OR IGNORE INTO waitlist (email, source, created_at) VALUES (?, ?, ?)')
    .bind(email, source.slice(0, 120), now())
    .run();
  return r.meta.changes > 0 ? 'added' : 'exists';
}

/* ---------- first-party analytics (no cookies, no IPs) ---------- */

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
