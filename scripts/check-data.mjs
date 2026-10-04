// Validates data/<directory>/*.json without booting Astro. Run in CI on pull requests.
// (The site also validates on build: see src/lib/apps.ts.)
import fs from 'node:fs';
import path from 'node:path';

const COMMON = ['slug', 'name', 'domain', 'category', 'priceMonthly', 'verdict', 'whatYouLose', 'priorArt', 'notes'];
const EXTRA = {
  prompts: (a) => typeof a.prompt === 'string' || 'needs "prompt"',
  skills: (a) => (a.skill?.name && (a.skill.skillMd || a.skill.sourceUrl)) || 'needs skill {name, skillMd | sourceUrl}',
  mcp: (a) =>
    (a.server && (a.server.transport === 'http' ? /^https?:\/\//.test(a.server.url ?? '') : a.server.transport === 'stdio' && a.server.command) && Array.isArray(a.tools)) ||
    'needs server {transport, url | command} and tools[]',
  plugins: (a) =>
    (a.plugin?.name && a.plugin.marketplace && a.plugin.marketplaceName && a.plugin.repoUrl && Array.isArray(a.plugin.includes)) ||
    'needs plugin {name, marketplace, marketplaceName, repoUrl, includes[]}',
};

let errors = 0;
let count = 0;
const fail = (f, m) => (errors++, console.error(`✗ ${f}: ${m}`));

for (const kind of Object.keys(EXTRA)) {
  const dir = path.resolve('data', kind);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const id = `${kind}/${f}`;
    count++;
    let a;
    try {
      a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch (e) {
      fail(id, `invalid JSON (${e.message})`);
      continue;
    }
    for (const k of COMMON) if (!(k in a)) fail(id, `missing "${k}"`);
    if (`${a.slug}.json` !== f) fail(id, 'file name must equal slug');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(a.slug ?? '')) fail(id, 'slug must be kebab-case');
    if (!['yes', 'kinda', 'no'].includes(a.verdict)) fail(id, 'verdict must be yes|kinda|no');
    if (!(a.priceMonthly === null || typeof a.priceMonthly === 'number')) fail(id, 'priceMonthly must be a number or null');
    if (!Array.isArray(a.whatYouLose)) fail(id, 'whatYouLose must be an array');
    if (!Array.isArray(a.priorArt) || a.priorArt.some((p) => !p.name || !/^https?:\/\//.test(p.url))) fail(id, 'priorArt must be [{name, url}]');
    const extra = EXTRA[kind](a); // truthy value when valid, or an error message
    if (typeof extra === 'string' && extra.startsWith('needs ')) fail(id, extra);
  }
}
if (errors) process.exit(1);
console.log(`✓ ${count} entries OK`);
