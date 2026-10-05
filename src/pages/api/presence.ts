import type { APIRoute } from 'astro';
import { onlineNow, touchPresence } from '../../lib/db';
import { json } from '../../lib/request';

export const prerender = false;

/** Heartbeat from an open tab (random per-tab id, no cookies). Returns how many people are on the site. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { s } = JSON.parse(await request.text()) as { s?: string };
    if (typeof s === 'string' && /^[a-f0-9]{16,32}$/.test(s)) await touchPresence(s);
  } catch {}
  return json({ online: Math.max(1, await onlineNow()) });
};
