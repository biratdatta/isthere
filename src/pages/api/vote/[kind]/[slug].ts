import type { APIRoute } from 'astro';
import { getEntry, keyOf } from '../../../../lib/apps';
import { isKind } from '../../../../lib/kinds';
import { castVote, hashIp, snapshot } from '../../../../lib/db';
import { clientIp, json, wantsJson } from '../../../../lib/request';
import { entryPath } from '../../../../lib/seo';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const { kind, slug } = ctx.params;
  const e = isKind(kind) ? getEntry(kind, slug ?? '') : undefined;
  if (!e) return json({ error: 'not-found' }, 404);

  const result = await castVote(keyOf(e), await hashIp(clientIp(ctx)));

  if (!wantsJson(ctx.request)) {
    // No-JS fallback: back to the entry page with a status flag.
    return ctx.redirect(`${entryPath(e)}?voted=${result.ok ? 'ok' : result.reason}#goods`, 303);
  }

  const { totals } = await snapshot();
  const body = { count: result.count, mrr: totals.all.mrr, votes: totals.all.votes, totals };
  if (!result.ok) return json({ ok: false, reason: result.reason, ...body }, result.reason === 'rate-limited' ? 429 : 409);
  return json({ ok: true, ...body });
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
