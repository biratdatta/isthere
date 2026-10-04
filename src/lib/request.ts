import type { APIContext } from 'astro';

/** Client IP as seen by Cloudflare. */
export function clientIp(ctx: Pick<APIContext, 'request' | 'clientAddress'>): string {
  const cf = ctx.request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
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

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
