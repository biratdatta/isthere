import type { APIRoute } from 'astro';
import { recordHit } from '../../lib/db';
import { SITE_HOST } from '../../lib/seo';

export const prerender = false;

/**
 * First-party, cookieless pageview counter. Stores (day, path, referrer host, count).
 * No IPs, no user agents, no identifiers. The client skips it when Do Not Track is on.
 */
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

export const POST: APIRoute = async ({ request }) => {
  if (BOT.test(request.headers.get('user-agent') ?? '')) return new Response(null, { status: 204 });
  try {
    const body = JSON.parse(await request.text()) as { p?: string; r?: string };
    const p = typeof body.p === 'string' && body.p.startsWith('/') ? body.p.split('?')[0] : null;
    if (!p) return new Response(null, { status: 204 });
    let ref = '';
    if (typeof body.r === 'string' && body.r) {
      try {
        const host = new URL(body.r).hostname;
        if (host && host !== SITE_HOST) ref = host;
      } catch {}
    }
    await recordHit(p, ref);
  } catch {}
  return new Response(null, { status: 204 });
};
