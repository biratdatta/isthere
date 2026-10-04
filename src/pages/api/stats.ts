import type { APIRoute } from 'astro';
import { stats } from '../../lib/db';
import { json } from '../../lib/request';

export const prerender = false;

export const GET: APIRoute = async () => json(await stats(), 200, { 'cache-control': 'public, max-age=60, s-maxage=60' });
