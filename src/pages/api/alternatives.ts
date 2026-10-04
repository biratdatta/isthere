import type { APIRoute } from 'astro';
import { addAltSuggestion, hashIp, rateLimit } from '../../lib/db';
import { isHttpUrl, str } from '../../lib/forms';
import { clientIp, json, wantsJson } from '../../lib/request';

export const prerender = false;

/** Suggest a free / open-source alternative to a paid app. Stored for review, never shown automatically. */
export const POST: APIRoute = async (ctx) => {
  const asJson = wantsJson(ctx.request);
  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return json({ ok: false, error: 'Could not read the form.' }, 400);
  }
  const back = (s: string) => ctx.redirect(`/alternatives?sent=${s}#suggest`, 303);
  const fail = (error: string, code = 400) => (asJson ? json({ ok: false, error }, code) : back(code === 429 ? 'limited' : 'invalid'));

  if (str(form, 'website', 200)) return asJson ? json({ ok: true }) : back('ok'); // honeypot

  const app = str(form, 'app', 80);
  const name = str(form, 'name', 80);
  const url = str(form, 'url', 300);
  const description = str(form, 'description', 200);
  const github = str(form, 'github', 40).replace(/^@/, '');

  if (!app) return fail('Which paid app is it an alternative to?');
  if (!name) return fail('What’s the alternative called?');
  if (!isHttpUrl(url)) return fail('The link should start with https://');
  if (github && !/^[A-Za-z0-9-]{1,39}$/.test(github)) return fail('That GitHub handle looks off.');
  if (!(await rateLimit(`alt:${await hashIp(clientIp(ctx))}`, 3600, 10))) return fail('Too many suggestions. Try again in an hour.', 429);

  await addAltSuggestion({ app, name, url, description, github });
  return asJson ? json({ ok: true }) : back('ok');
};
