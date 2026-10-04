import type { APIContext } from 'astro';

/** Best-effort client IP. Only trusts proxy headers when TRUST_PROXY=1. */
export function clientIp(ctx: Pick<APIContext, 'request' | 'clientAddress'>): string {
  if (process.env.TRUST_PROXY === '1') {
    const xff = ctx.request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const real = ctx.request.headers.get('x-real-ip');
    if (real) return real.trim();
  }
  try {
    return ctx.clientAddress || '0.0.0.0';
  } catch {
    return '0.0.0.0';
  }
}

export function wantsJson(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.includes('application/json') || request.headers.get('x-requested-with') === 'fetch';
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
