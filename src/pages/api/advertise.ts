import type { APIRoute } from 'astro';
import { addAdRequest, hashIp, rateLimit } from '../../lib/db';
import { EMAIL_RE, isHttpUrl, str } from '../../lib/forms';
import { clientIp, json, wantsJson } from '../../lib/request';

export const prerender = false;

const SLOTS = ['left', 'right', 'takeover', 'footer'];

export const POST: APIRoute = async (ctx) => {
  const asJson = wantsJson(ctx.request);
  const respond = (status: string, code = 200, error?: string) =>
    asJson ? json({ ok: code < 400, status, error }, code) : ctx.redirect(`/advertise?sent=${status}`, 303);

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return respond('invalid', 400, 'Could not read the form.');
  }
  if (str(form, 'website', 200)) return respond('ok'); // honeypot

  const slot = str(form, 'slot', 20);
  const week = str(form, 'week', 10);
  const company = str(form, 'company', 100);
  const url = str(form, 'url', 300);
  const email = str(form, 'email', 254).toLowerCase();

  if (!SLOTS.includes(slot)) return respond('invalid', 400, 'Pick a slot.');
  if (!/^\d{4}-W\d{2}$/.test(week)) return respond('invalid', 400, 'Pick a starting week.');
  if (!company) return respond('invalid', 400, 'Add your company or product name.');
  if (!isHttpUrl(url)) return respond('invalid', 400, 'The link should start with https://');
  if (!EMAIL_RE.test(email)) return respond('invalid', 400, 'That email looks off.');

  if (!(await rateLimit(`advertise:${await hashIp(clientIp(ctx))}`, 3600, 5))) return respond('limited', 429, 'Too many requests. Try again in an hour.');

  await addAdRequest({ slot, week, company, url, email, notes: str(form, 'notes', 1000) });
  return respond('ok');
};
