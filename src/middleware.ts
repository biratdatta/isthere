import { defineMiddleware } from 'astro:middleware';

/**
 * Runs for on-demand routes (the API and legacy redirects). Prerendered pages get
 * their headers from public/_headers. The short-link subdomains
 * (isthereanmcpforit.biratdatta.tech, …) are handled by Cloudflare Redirect Rules; see README.
 */
export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  try {
    res.headers.set('x-content-type-options', 'nosniff');
    res.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    res.headers.set('x-frame-options', 'DENY');
  } catch {
    // Some responses (e.g. redirects) have immutable headers.
  }
  return res;
});
