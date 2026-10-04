import { defineMiddleware } from 'astro:middleware';
import { KINDS, KIND_ORDER } from './lib/kinds';
import { getEntry } from './lib/apps';

/** isthereaskillforit.biratdatta.com → https://isthere.biratdatta.com/skills (and so on). */
const VANITY = new Map(KIND_ORDER.flatMap((k) => KINDS[k].vanity.map((v) => [v, k] as const)));

function requestHost(request: Request): string {
  const fwd = process.env.TRUST_PROXY === '1' ? request.headers.get('x-forwarded-host') : null;
  return (fwd || request.headers.get('host') || '').split(',')[0].trim().toLowerCase();
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const host = requestHost(ctx.request);
  const label = host.split('.')[0];
  const kind = VANITY.get(label);
  if (kind && ctx.site && host !== ctx.site.host) {
    // /notion on a vanity host → /<kind>/notion if that entry exists, else a search in that directory.
    const slug = ctx.url.pathname.replace(/^\/+|\/+$/g, '');
    let target = `/${kind}${ctx.url.search}`;
    if (slug && /^[a-z0-9-]+$/.test(slug)) target = getEntry(kind, slug) ? `/${kind}/${slug}` : `/${kind}?q=${encodeURIComponent(slug)}`;
    return new Response(null, {
      status: 301,
      headers: { location: new URL(target, ctx.site).href, 'cache-control': 'public, max-age=86400' },
    });
  }

  const res = await next();
  try {
    res.headers.set('x-content-type-options', 'nosniff');
    res.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    res.headers.set('x-frame-options', 'DENY');
    res.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  } catch {
    // Some responses (e.g. redirects) have immutable headers.
  }
  return res;
});
