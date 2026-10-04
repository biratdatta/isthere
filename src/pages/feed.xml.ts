import type { APIRoute } from 'astro';
import { ENTRIES, addedOn, formatPrice, lastPriceChange } from '../lib/apps';
import { KINDS } from '../lib/kinds';
import { SITE_NAME, SITE_TAGLINE, entryPath } from '../lib/seo';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rfc = (d: string) => new Date(`${d}T12:00:00Z`).toUTCString();

/** RSS 2.0: new entries and price changes. */
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const items = [
    ...ENTRIES.map((e) => ({
      date: addedOn(e),
      title: `${KINDS[e.kind].entryTitle(e.name)} ${KINDS[e.kind].verdicts[e.verdict].label}`,
      link: abs(entryPath(e)),
      guid: abs(entryPath(e)),
      desc: e.notes,
    })),
    ...ENTRIES.flatMap((e) => {
      const c = lastPriceChange(e);
      return c
        ? [{ date: c.date, title: `${e.name} price change: ${formatPrice(c.from)} → ${formatPrice(c.to)}`, link: abs(entryPath(e)), guid: `${abs(entryPath(e))}#price-${c.date}`, desc: c.note ?? `${e.name} changed its entry price.` }]
        : [];
    }),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(SITE_NAME)}</title><link>${abs('/')}</link><description>${esc(SITE_TAGLINE)}</description><language>en</language>
<atom:link href="${abs('/feed.xml')}" rel="self" type="application/rss+xml"/>
${items.map((i) => `<item><title>${esc(i.title)}</title><link>${i.link}</link><guid isPermaLink="${i.guid === i.link}">${esc(i.guid)}</guid><pubDate>${rfc(i.date)}</pubDate><description>${esc(i.desc)}</description></item>`).join('\n')}
</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
