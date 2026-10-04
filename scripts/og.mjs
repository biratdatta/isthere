// Build-time Open Graph images: satori (JSX-less element tree -> SVG) + resvg (SVG -> PNG).
// Writes public/og/index.png, public/og/<directory>.png and public/og/<directory>/<slug>.png.
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
  { name: 'Bricolage Grotesque', data: font('@fontsource/bricolage-grotesque', 'bricolage-grotesque-latin-800-normal.woff'), weight: 700, style: 'normal' },
  { name: 'Geist Mono', data: font('@fontsource/geist-mono', 'geist-mono-latin-500-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Geist Mono', data: font('@fontsource/geist-mono', 'geist-mono-latin-700-normal.woff'), weight: 700, style: 'normal' },
];

// Bento palette (light), matching src/styles/global.css
const C = { bg: '#f4f5f8', line: '#e3e6ec', text: '#0e1322', muted: '#525a70', primary: '#1d4fe0', green: '#137a3f', amber: '#9a5b00', red: '#c22a2a' };
const VERDICT = { yes: ['YES', C.green], kinda: ['KINDA', C.amber], no: ['NOT REALLY', C.red] };

// Brand mark (public/favicon.svg) for the cards, plus a PNG touch icon.
const MARK_SVG = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8');
const KIND_COLOR = { skills: '#4f7cff', mcp: '#2fbf71', plugins: '#f05252', prompts: '#f5a524' };
const markFor = (kind) => {
  const svg = kind ? MARK_SVG.replace(/fill="#(4f7cff|2fbf71|f05252|f5a524)"/g, `fill="${KIND_COLOR[kind]}"`) : MARK_SVG;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};
fs.writeFileSync(path.join(root, 'public/apple-touch-icon.png'), new Resvg(MARK_SVG, { fitTo: { mode: 'width', value: 180 } }).render().asPng());

const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });
const price = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

function frame(children, kind) {
  return h(
    'div',
    {
      width: 1200,
      height: 630,
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
      background: C.bg,
      color: C.text,
      fontFamily: 'Geist Mono',
    },
    [
      h('div', { alignItems: 'center', fontFamily: 'Bricolage Grotesque', fontSize: 34, fontWeight: 700, letterSpacing: -1 }, [
        { type: 'img', props: { src: markFor(kind), width: 48, height: 48, style: { marginRight: 14 } } },
        h('div', {}, 'is'),
        h('div', { color: C.primary }, 'there'),
        h('div', {}, '?'),
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
      h('div', { fontFamily: 'Bricolage Grotesque', fontSize: app.name.length > 16 ? 88 : app.name.length > 11 ? 104 : 128, fontWeight: 700, lineHeight: 1, letterSpacing: -4, color: C.text }, big),
    ]),
    h('div', { justifyContent: 'space-between', alignItems: 'flex-end' }, [
      h('div', { alignItems: 'center', gap: 18 }, [
        h('div', { padding: '14px 26px', border: `4px solid ${color}`, borderRadius: 14, color, fontSize: 56, fontWeight: 700, background: '#ffffff' }, label),
        h('div', { fontSize: 26, color: C.muted }, kind === 'prompts' ? 'with one AI prompt' : `${k.word} directory`),
      ]),
      app.priceMonthly != null
        ? h('div', { flexDirection: 'column', alignItems: 'flex-end', gap: 4 }, [
            h('div', { fontSize: 22, color: C.muted }, kind === 'mcp' ? 'APP COSTS' : 'MRR AT STAKE'),
            h('div', { fontSize: 52, fontWeight: 700, color: C.green }, `${price(app.priceMonthly)}/mo`),
          ])
        : h('div', {}, ''),
    ]),
  ], kind);
}

function homeCard(count) {
  return frame([
    h('div', { fontFamily: 'Bricolage Grotesque', fontSize: 84, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3, color: C.text }, 'Is there a skill, an MCP, a plugin or a prompt for it?'),
    h('div', { justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 28 }, [
      h('div', { color: C.muted }, `${count} SaaS apps · 4 directories · honest verdicts`),
      h('div', { color: C.primary, fontWeight: 700, fontSize: 34 }, 'isthere.biratdatta.tech'),
    ]),
  ]);
}

function kindCard(kind, apps) {
  const k = KINDS[kind];
  const yes = apps.filter((a) => a.verdict === 'yes').length;
  return frame([
    h('div', { fontFamily: 'Bricolage Grotesque', fontSize: 110, fontWeight: 700, lineHeight: 1.02, letterSpacing: -4, color: C.text }, `Is there ${k.article} ${k.word} for it?`),
    h('div', { justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 28 }, [
      h('div', { color: C.muted }, `${apps.length} apps · ${yes} ${k.labels.yes}`),
      h('div', { color: C.green, fontWeight: 700, fontSize: 34 }, `/${kind}`),
    ]),
  ], kind);
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
n += 1;
for (const [kind, apps] of all) {
  await render(kindCard(kind, apps), `${kind}.png`);
  n++;
  for (const app of apps) {
    await render(appCard(app, kind), `${kind}/${app.slug}.png`);
    n++;
  }
}
console.log(`[og] ${n} images → public/og in ${Date.now() - t0}ms`);
