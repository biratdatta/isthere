import type { APIRoute } from 'astro';
import { queue } from '../../lib/db';
import { json } from '../../lib/request';

export const prerender = false;

/** The public review queue: app name, directory, credit handle and status only. */
export const GET: APIRoute = async () => json({ items: await queue() }, 200, { 'cache-control': 'public, max-age=60, s-maxage=60' });
