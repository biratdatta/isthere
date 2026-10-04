import type { APIRoute } from 'astro';
import { anyBySlug } from '../../../lib/apps';
import { getFavicon, putFavicon } from '../../../lib/db';

/**
 * Favicon proxy: fetched server-side and cached in SQLite, so visitors never
 * hit a third-party icon service. Only domains from data/ are allowed.
 */
const TTL = 7 * 86400;
const MAX_BYTES = 200_000;

function monogram(name: string) {
  const ch = (name.match(/[A-Za-z0-9]/)?.[0] ?? '?').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0d130d"/><text x="32" y="43" text-anchor="middle" font-family="monospace" font-weight="700" font-size="34" fill="#39ff7a">${ch}</text></svg>`;
}

const headers = (type: string) => ({
  'content-type': type,
  'cache-control': 'public, max-age=604800, stale-while-revalidate=86400',
  'x-content-type-options': 'nosniff',
});

async function fetchIcon(domain: string): Promise<{ mime: string; body: Buffer } | null> {
  const sources = [`https://icons.duckduckgo.com/ip3/${domain}.ico`, `https://${domain}/favicon.ico`];
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3500), redirect: 'follow' });
      if (!res.ok) continue;
      const mime = (res.headers.get('content-type') || '').split(';')[0].trim();
      // Raster only: never re-serve third-party SVG from our origin.
      if (!mime.startsWith('image/') || mime.includes('svg')) continue;
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length === 0 || body.length > MAX_BYTES) continue;
      return { mime, body };
    } catch {}
  }
  return null;
}

export const GET: APIRoute = async ({ params }) => {
  const app = anyBySlug(params.slug ?? '');
  if (!app) return new Response('Not found', { status: 404 });

  const cached = getFavicon(app.domain);
  // A failed lookup ("none") is retried after an hour; a real icon is kept for a week.
  const fresh = cached && Date.now() / 1000 - cached.fetched_at < (cached.mime === 'none' ? 3600 : TTL);
  if (cached && fresh) {
    if (cached.mime === 'none') return new Response(monogram(app.name), { headers: headers('image/svg+xml') });
    return new Response(new Uint8Array(cached.body), { headers: headers(cached.mime) });
  }

  const icon = await fetchIcon(app.domain);
  if (icon) {
    putFavicon(app.domain, icon.mime, icon.body);
    return new Response(new Uint8Array(icon.body), { headers: headers(icon.mime) });
  }
  if (cached && cached.mime !== 'none') return new Response(new Uint8Array(cached.body), { headers: headers(cached.mime) });
  putFavicon(app.domain, 'none', Buffer.alloc(0));
  return new Response(monogram(app.name), { headers: headers('image/svg+xml') });
};
