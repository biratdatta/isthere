import type { APIRoute } from 'astro';
import { hashIp, upvoteRequest } from '../../../lib/db';
import { clientIp, json, wantsJson } from '../../../lib/request';

export const prerender = false;

/** +1 an app request. One vote per person per request. */
export const POST: APIRoute = async (ctx) => {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id < 1) return json({ ok: false, reason: 'not-found' }, 404);
  const r = await upvoteRequest(id, await hashIp(clientIp(ctx)));
  if (!wantsJson(ctx.request)) return ctx.redirect(`/requests?sent=${r.ok ? 'ok' : r.reason}`, 303);
  return json(r, r.ok ? 200 : r.reason === 'not-found' ? 404 : r.reason === 'rate-limited' ? 429 : 409);
};
