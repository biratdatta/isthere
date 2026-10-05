import type { APIRoute } from 'astro';
import { live } from '../../lib/db';
import { json } from '../../lib/request';

export const prerender = false;

/** Live counters for the header pill, home stats bar, footer and app pages. ?path=/prompts/calendly adds that page's views. */
export const GET: APIRoute = async ({ url }) => {
  const p = url.searchParams.get('path');
  const path = p && /^\/[a-z0-9/_-]{0,120}$/i.test(p) ? p : null;
  return json(await live(path), 200, { 'cache-control': 'public, max-age=15, s-maxage=15' });
};
