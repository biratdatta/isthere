// Build-time Open Graph images: satori (JSX-less element tree -> SVG) + resvg (SVG -> PNG).
// Writes public/og/index.png, public/og/rebuild.png and public/og/<slug>.png.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'public/og');
fs.mkdirSync(outDir, { recursive: true });

const font = (pkg, file) => fs.readFileSync(path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'files', file));
const fonts = [
  { name: 'Space Grotesk', data: font('@fontsource/space-grotesk', 'space-grotesk-latin-700-normal.woff'), weight: 700, style: 'normal' },
  { name: 'JetBrains Mono', data: font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'JetBrains Mono', data: font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff'), weight: 700, style: 'normal' },
];

const C = { bg: '#050705', line: '#16241a', text: '#d6e5d6', muted: '#7d927f', green: '#39ff7a', amber: '#ffb02e', red: '#ff5a52' };
const VERDICT = { yes: ['YES', C.green], kinda: ['KINDA', C.amber], no: ['NOT REALLY', C.red] };

const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });
const price = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

function frame(children) {
  return h(
    'div',
    {
      width: 1200,
      height: 630,
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
      background: C.bg,
      backgroundImage: `radial-gradient(ellipse at 20% 0%, rgba(57,255,122,0.16), transparent 60%), linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
      backgroundSize: '100% 100%, 48px 48px, 48px 48px',
      color: C.text,
      fontFamily: 'JetBrains Mono',
    },
    [
      h('div', { alignItems: 'center', gap: 14, fontSize: 28, fontWeight: 700 }, [
        h('div', { color: C.green }, '>'),
        h('div', {}, 'is there a skill for it?'),
        h('div', { width: 16, height: 30, background: C.green }, ''),
      ]),
      ...children,
    ]
  );
}

// Mirrors src/lib/kinds.ts (kept in plain JS so this script runs without a build step).
const KINDS = {
  skills: { word: 'skill', article: 'a', top: (n) => ['Is there a skill for', `${n}?`], labels: { yes: 'YES', kinda: 'KINDA', no: 'NOT REALLY' } },
  mcp: { word: 'MCP', article: 'an', top: (n) => ['Is there an MCP for', `${n}?`], labels: { yes: 'OFFICIAL', kinda: 'COMMUNITY', no: 'NOT YET' } },
  plugins: { word: 'plugin', article: 'a', top: (n) => ['Is there a plugin for', `${n}?`], labels: { yes: 'YES', kinda: 'KINDA', no: 'NOT REALLY' } },
  prompts: { word: 'prompt', article: 'a', top: (n) => ['Can you replace', `${n}?`], labels: { yes: 'YES', kinda: 'KINDA', no: 'NOT REALLY' } },
};

function appCard(app, kind) {
  const k = KINDS[kind];
  const [, color] = VERDICT[app.verdict];
  const label = k.labels[app.verdict];
  const [lead, big] = k.top(app.name);
  return frame([
    h('div', { flexDirection: 'column', gap: 18 }, [
      h('div', { fontSize: 30, color: C.muted }, lead),
      h('div', { fontFamily: 'Space Grotesk', fontSize: app.name.length > 16 ? 88 : app.name.length > 11 ? 104 : 128, fontWeight: 700, lineHeight: 1, letterSpacing: -4, color: '#fff' }, big),
    ]),
    h('div', { justifyContent: 'space-between', alignItems: 'flex-end' }, [
      h('div', { alignItems: 'center', gap: 18 }, [
        h('div', { padding: '14px 26px', border: `4px solid ${color}`, borderRadius: 14, color, fontSize: 56, fontWeight: 700, background: 'rgba(0,0,0,0.35)' }, label),
        h('div', { fontSize: 26, color: C.muted }, kind === 'prompts' ? 'with one AI prompt' : `${k.word} directory`),
      ]),
      app.priceMonthly != null
        ? h('div', { flexDirection: 'column', alignItems: 'flex-end', gap: 4 }, [
            h('div', { fontSize: 22, color: C.muted }, kind === 'mcp' ? 'APP COSTS' : 'MRR AT STAKE'),
            h('div', { fontSize: 52, fontWeight: 700, color: C.green }, `${price(app.priceMonthly)}/mo`),
          ])
        : h('div', {}, ''),
    ]),
  ]);
}

function homeCard(count) {
  return frame([
    h('div', { fontFamily: 'Space Grotesk', fontSize: 84, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3, color: '#fff' }, 'Is there a skill, an MCP, a plugin or a prompt for it?'),
    h('div', { justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 28 }, [
      h('div', { color: C.muted }, `${count} SaaS apps · 4 directories · honest verdicts`),
      h('div', { color: C.green, fontWeight: 700, fontSize: 34 }, 'isthere'),
    ]),
  ]);
}

function kindCard(kind, apps) {
  const k = KINDS[kind];
  const yes = apps.filter((a) => a.verdict === 'yes').length;
  return frame([
    h('div', { fontFamily: 'Space Grotesk', fontSize: 110, fontWeight: 700, lineHeight: 1.02, letterSpacing: -4, color: '#fff' }, `Is there ${k.article} ${k.word} for it?`),
    h('div', { justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 28 }, [
      h('div', { color: C.muted }, `${apps.length} apps · ${yes} ${k.labels.yes}`),
      h('div', { color: C.green, fontWeight: 700, fontSize: 34 }, `/${kind}`),
    ]),
  ]);
}

function rebuildCard() {
  return frame([
    h('div', { fontFamily: 'Space Grotesk', fontSize: 96, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, color: '#fff' }, 'This site is one prompt.'),
    h('div', { justifyContent: 'space-between', fontSize: 30 }, [
      h('div', { color: C.muted }, 'Copy it. Rebuild it. MIT.'),
      h('div', { color: C.green, fontWeight: 700 }, '/rebuild'),
    ]),
  ]);
}

async function render(tree, file) {
  const svg = await satori(tree, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  const dest = path.join(outDir, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, png);
}

const load = (kind) => {
  const dir = path.join(root, 'data', kind);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
};

const t0 = Date.now();
let n = 0;
const all = Object.keys(KINDS).map((kind) => [kind, load(kind)]);
await render(homeCard(all.reduce((s, [, a]) => s + a.length, 0)), 'index.png');
await render(rebuildCard(), 'rebuild.png');
n += 2;
for (const [kind, apps] of all) {
  await render(kindCard(kind, apps), `${kind}.png`);
  n++;
  for (const app of apps) {
    await render(appCard(app, kind), `${kind}/${app.slug}.png`);
    n++;
  }
}
console.log(`[og] ${n} images → public/og in ${Date.now() - t0}ms`);
