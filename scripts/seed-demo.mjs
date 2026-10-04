// Local development only: fills the vote counters with fake numbers so the
// lists and tickers have something to show. Never run against production.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo votes with NODE_ENV=production.');
  process.exit(1);
}

const DB_PATH = process.env.DB_PATH || path.resolve('data/db/site.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS votes (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
// Same v2 migration as src/lib/db.ts: old keys were bare prompt slugs.
if (Number(db.prepare("SELECT value FROM meta WHERE key = 'schema'").get()?.value ?? 1) < 2) {
  db.exec(`UPDATE votes SET slug = 'prompts:' || slug WHERE instr(slug, ':') = 0;
  INSERT INTO meta (key, value) VALUES ('schema', '2') ON CONFLICT(key) DO UPDATE SET value = '2';`);
}

const weight = { yes: 220, kinda: 90, no: 25 };
const upsert = db.prepare('INSERT INTO votes (slug, count) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET count = excluded.count');
let n = 0;
for (const kind of ['skills', 'mcp', 'plugins', 'prompts']) {
  const dir = path.resolve('data', kind);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const app = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    upsert.run(`${kind}:${app.slug}`, Math.round(weight[app.verdict] * (0.3 + Math.random())));
    n++;
  }
}
console.log(`Seeded demo votes for ${n} entries into ${DB_PATH}`);
