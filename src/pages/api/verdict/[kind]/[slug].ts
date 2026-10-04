import type { APIRoute } from 'astro';
import { getEntry, keyOf } from '../../../../lib/apps';
import { isKind } from '../../../../lib/kinds';
import { castVerdictVote, hashIp } from '../../../../lib/db';
import { clientIp, json, wantsJson } from '../../../../lib/request';
import { entryPath } from '../../../../lib/seo';

export const prerender = false;

/** Agree or disagree with an entry's verdict. One vote per person per entry per 30 days. */
export const POST: APIRoute = async (ctx) => {
  const { kind, slug } = ctx.params;
  const e = isKind(kind) ? getEntry(kind, slug ?? '') : undefined;
  if (!e) return json({ error: 'not-found' }, 404);
  let agree = true;
  try {
    agree = String((await ctx.request.formData()).get('agree') ?? '1') !== '0';
  } catch {}
  const r = await castVerdictVote(keyOf(e), agree, await hashIp(clientIp(ctx)));
  if (!wantsJson(ctx.request)) return ctx.redirect(`${entryPath(e)}?verdict=${r.ok ? 'ok' : r.reason}`, 303);
  return json(r, r.ok ? 200 : r.reason === 'rate-limited' ? 429 : 409);
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
