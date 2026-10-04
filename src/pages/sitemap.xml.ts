import type { APIRoute } from 'astro';
import { ENTRIES } from '../lib/apps';
import { KIND_ORDER } from '../lib/kinds';
import { entryPath } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  const base = site!;
  const urls = [
    { loc: new URL('/', base).href, priority: '1.0', changefreq: 'hourly' },
    ...KIND_ORDER.map((k) => ({ loc: new URL(`/${k}`, base).href, priority: '0.9', changefreq: 'daily' })),
    ...ENTRIES.map((e) => ({ loc: new URL(entryPath(e), base).href, priority: '0.8', changefreq: 'weekly' })),
    { loc: new URL('/rebuild', base).href, priority: '0.4', changefreq: 'monthly' },
  ];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
