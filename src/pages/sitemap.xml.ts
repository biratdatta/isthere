import type { APIRoute } from 'astro';
import { CATEGORIES, ENTRIES, apps } from '../lib/apps';
import { KIND_ORDER } from '../lib/kinds';
import { entryPath } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  const base = site!;
  const urls = [
    { loc: new URL('/', base).href, priority: '1.0', changefreq: 'hourly' },
    ...KIND_ORDER.map((k) => ({ loc: new URL(`/${k}`, base).href, priority: '0.9', changefreq: 'daily' })),
    ...ENTRIES.map((e) => ({ loc: new URL(entryPath(e), base).href, priority: '0.8', changefreq: 'weekly' })),
    ...apps().map((a) => ({ loc: new URL(`/compare/${a.slug}`, base).href, priority: '0.7', changefreq: 'weekly' })),
    ...Object.keys(CATEGORIES)
      .filter((c) => ENTRIES.some((e) => e.category === c))
      .map((c) => ({ loc: new URL(`/category/${c}`, base).href, priority: '0.7', changefreq: 'weekly' })),
    ...['/categories', '/cancel-culture', '/alternatives', '/new', '/stats', '/requests', '/contributors', '/queue', '/stack', '/submit', '/advertise'].map((p) => ({ loc: new URL(p, base).href, priority: '0.5', changefreq: 'daily' })),
  ];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
