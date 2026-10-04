import type { APIRoute } from 'astro';
import { pulse } from '../../lib/db';
import { json } from '../../lib/request';

export const prerender = false;

/** Live numbers for the footer on every page. Cached briefly at the edge. */
export const GET: APIRoute = async () => json(await pulse(), 200, { 'cache-control': 'public, max-age=30, s-maxage=30' });
