import type { APIRoute } from 'astro';
import { snapshot } from '../../lib/db';
import { json } from '../../lib/request';

export const prerender = false;

/** Live vote counts + ticker totals for the prerendered pages. Cached briefly at the edge. */
export const GET: APIRoute = async () => {
  const data = await snapshot();
  return json(data, 200, { 'cache-control': 'public, max-age=15, s-maxage=15' });
};
