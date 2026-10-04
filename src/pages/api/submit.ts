import type { APIRoute } from 'astro';
import { addSubmission, hashIp, rateLimit } from '../../lib/db';
import { EMAIL_RE, isHttpUrl, str } from '../../lib/forms';
import { isKind } from '../../lib/kinds';
import { clientIp, json, wantsJson } from '../../lib/request';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const asJson = wantsJson(ctx.request);
  const respond = (status: string, code = 200, error?: string) =>
    asJson ? json({ ok: code < 400, status, error }, code) : ctx.redirect(`/submit?sent=${status}`, 303);

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return respond('invalid', 400, 'Could not read the form.');
  }

  // Honeypot: bots fill every field. Pretend success, store nothing.
  if (str(form, 'website', 200)) return respond('ok');

  const directory = str(form, 'directory', 20);
  const app = str(form, 'app', 80);
  const appUrl = str(form, 'appUrl', 200);
  const link = str(form, 'link', 300);
  const verdict = str(form, 'verdict', 10);
  const email = str(form, 'email', 254).toLowerCase();
  const github = str(form, 'github', 40).replace(/^@/, '');

  if (!isKind(directory)) return respond('invalid', 400, 'Pick a directory.');
  if (!app) return respond('invalid', 400, 'Which paid app does it replace?');
  if (!isHttpUrl(link)) return respond('invalid', 400, 'The replacement link should start with https://');
  if (appUrl && !isHttpUrl(appUrl)) return respond('invalid', 400, 'The app’s website should start with https://');
  if (!['yes', 'kinda', 'no'].includes(verdict)) return respond('invalid', 400, 'Pick a verdict.');
  if (email && !EMAIL_RE.test(email)) return respond('invalid', 400, 'That email looks off.');
  if (github && !/^[A-Za-z0-9-]{1,39}$/.test(github)) return respond('invalid', 400, 'That GitHub handle looks off.');

  if (!(await rateLimit(`submit:${await hashIp(clientIp(ctx))}`, 3600, 5))) return respond('limited', 429, 'Too many submissions. Try again in an hour.');

  await addSubmission({ directory, app, appUrl, link, verdict, lose: str(form, 'lose', 2000), install: str(form, 'install', 8000), github, email });
  return respond('ok');
};
