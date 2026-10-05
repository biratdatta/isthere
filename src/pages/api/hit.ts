import type { APIRoute } from 'astro';
import { recordHit, recordVisitCountry, touchPresence } from '../../lib/db';
import { SITE_HOST } from '../../lib/seo';

export const prerender = false;

/**
 * Page counter. Stores (day, path, referrer host, count).
 */
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

export const POST: APIRoute = async ({ request }) => {
  if (BOT.test(request.headers.get('user-agent') ?? '')) return new Response(null, { status: 204 });
  try {
    const body = JSON.parse(await request.text()) as { p?: string; r?: string; s?: string };
    const p = typeof body.p === 'string' && body.p.startsWith('/') ? body.p.split('?')[0] : null;
    if (!p) return new Response(null, { status: 204 });
    let ref = '';
    if (typeof body.r === 'string' && body.r) {
      try {
        const host = new URL(body.r).hostname;
        if (host && host !== SITE_HOST) ref = host;
      } catch {}
    }
    const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? request.headers.get('cf-ipcountry');
    await Promise.all([recordHit(p, ref), recordVisitCountry(country)]);
    if (typeof body.s === 'string' && /^[a-f0-9]{16,32}$/.test(body.s)) await touchPresence(body.s, country);
  } catch {}
  return new Response(null, { status: 204 });
};
