import type { APIRoute } from 'astro';
import { hashIp, listRequests, requestApp } from '../../../lib/db';
import { isKind } from '../../../lib/kinds';
import { str } from '../../../lib/forms';
import { clientIp, json, wantsJson } from '../../../lib/request';

export const prerender = false;

export const GET: APIRoute = async () => json({ items: await listRequests() }, 200, { 'cache-control': 'public, max-age=20, s-maxage=20' });

/** Request an app to be checked (or +1 an existing request with the same name). */
export const POST: APIRoute = async (ctx) => {
  const asJson = wantsJson(ctx.request);
  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return json({ ok: false, error: 'Invalid form.' }, 400);
  }
  const back = (s: string) => ctx.redirect(`/requests?sent=${s}`, 303);
  if (str(form, 'website', 200)) return asJson ? json({ ok: true }) : back('ok'); // honeypot
  const name = str(form, 'name', 60).replace(/\s+/g, ' ');
  if (name.length < 2 || !/[a-z0-9]/i.test(name)) return asJson ? json({ ok: false, error: 'Type the app’s name.' }, 400) : back('invalid');
  const dir = str(form, 'directory', 20);
  const r = await requestApp(name, isKind(dir) ? dir : null, await hashIp(clientIp(ctx)));
  if (!asJson) return back(r.ok ? 'ok' : r.reason ?? 'invalid');
  if (r.ok) return json({ ...r });
  const error = r.reason === 'already-voted' ? 'Already requested. Your vote is counted.' : r.reason === 'rate-limited' ? 'Too many requests. Try again in an hour.' : 'Something went wrong.';
  return json({ ...r, error }, r.reason === 'rate-limited' ? 429 : 409);
};
