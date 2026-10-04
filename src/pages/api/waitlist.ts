import type { APIRoute } from 'astro';
import { hashIp, joinWaitlist, rateLimit } from '../../lib/db';
import { clientIp, json, wantsJson } from '../../lib/request';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const POST: APIRoute = async (ctx) => {
  const asJson = wantsJson(ctx.request);
  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return json({ ok: false, status: 'invalid' }, 400);
  }

  const source = String(form.get('source') ?? '').slice(0, 120);
  const back = (status: string) => {
    const path = /^(skills|mcp|plugins|prompts)(\/[a-z0-9-]+)?$/.test(source) ? `/${source}` : '/';
    return ctx.redirect(`${path}?waitlist=${status}#waitlist`, 303);
  };
  const respond = (status: string, code = 200) => (asJson ? json({ ok: code < 400, status }, code) : back(status));

  // Honeypot: bots fill every field. Pretend success, store nothing.
  if (String(form.get('website') ?? '').trim() !== '') return respond('added');

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return respond('invalid', 400);

  if (!rateLimit(`waitlist:${hashIp(clientIp(ctx))}`, 3600, 5)) return respond('limited', 429);

  return respond(joinWaitlist(email, source));
};
