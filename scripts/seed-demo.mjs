// Local development only: fills the LOCAL D1 database with fake vote counts so the
// lists and tickers have something to show. It never touches the remote database.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const weight = { yes: 220, kinda: 90, no: 25 };
const rows = [];
for (const kind of ['skills', 'mcp', 'plugins', 'prompts', 'agents']) {
  const dir = path.resolve('data', kind);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const app = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    rows.push(`('${kind}:${app.slug}', ${Math.round(weight[app.verdict] * (0.3 + Math.random()))})`);
  }
}

const sql = `INSERT INTO votes (slug, count) VALUES\n${rows.join(',\n')}\nON CONFLICT(slug) DO UPDATE SET count = excluded.count;\n`;
fs.mkdirSync('.wrangler', { recursive: true });
const file = path.join('.wrangler', 'seed-demo.sql');
fs.writeFileSync(file, sql);

execFileSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'isthere', '--local'], { stdio: 'inherit' });
execFileSync('npx', ['wrangler', 'd1', 'execute', 'isthere', '--local', `--file=${file}`], { stdio: 'inherit' });
console.log(`Seeded demo votes for ${rows.length} entries into the local D1 database.`);
