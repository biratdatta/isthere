import type { APIRoute } from 'astro';
import { ENTRIES, getEntry, verdictLabel, type Entry } from '../../../lib/apps';
import { KINDS, type Kind } from '../../../lib/kinds';

/** README badge, e.g. /badge/mcp/notion.svg → "isthere · MCP | OFFICIAL". Prerendered. */
export function getStaticPaths() {
  return ENTRIES.map((e) => ({ params: { kind: e.kind, slug: e.slug } }));
}

const COLORS: Record<Entry['verdict'], string> = { yes: '#137a3f', kinda: '#9a5b00', no: '#c22a2a' };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Rough text width for 11px Verdana/DejaVu (the shields.io convention).
const width = (s: string) => Math.round([...s].reduce((w, ch) => w + (/[A-Z]/.test(ch) ? 7.6 : /[ il.·]/.test(ch) ? 3.6 : 6.6), 0)) + 12;

export const GET: APIRoute = ({ params }) => {
  const e = getEntry(params.kind as Kind, params.slug ?? '')!;
  const left = `isthere · ${KINDS[e.kind].word}`;
  const right = verdictLabel(e);
  const lw = width(left) + 16;
  const rw = width(right);
  const w = lw + rw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(`${left}: ${right}`)}"><title>${esc(`${KINDS[e.kind].entryTitle(e.name)} ${right}`)}</title><clipPath id="r"><rect width="${w}" height="20" rx="4"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#0e1322"/><rect x="${lw}" width="${rw}" height="20" fill="${COLORS[e.verdict]}"/></g><g transform="translate(4 4) scale(0.1875)"><rect width="64" height="64" rx="16" fill="#0e1322"/><path d="M22.5 22A9.5 9.5 0 1 1 36.5 30.3C33.5 32 32 34 32 37.5V39" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><rect x="27" y="43.5" width="4.6" height="4.6" rx="1.2" fill="#4f7cff"/><rect x="32.4" y="43.5" width="4.6" height="4.6" rx="1.2" fill="#2fbf71"/><rect x="27" y="48.9" width="4.6" height="4.6" rx="1.2" fill="#f05252"/><rect x="32.4" y="48.9" width="4.6" height="4.6" rx="1.2" fill="#f5a524"/></g><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="20" y="14">${esc(left)}</text><text x="${lw + rw / 2}" y="14" text-anchor="middle" font-weight="bold">${esc(right)}</text></g></svg>`;
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
};
