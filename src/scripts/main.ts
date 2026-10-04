/* Vanilla JS for every interaction. No framework, no third parties. */

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

const store = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch {}
  },
};

/* ---------- toast ---------- */
let toastTimer: number | undefined;
function toast(msg: string) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2200);
}

function confirmBtn(btn: HTMLElement, ms = 1800) {
  btn.dataset.state = 'done';
  clearTimeout(Number(btn.dataset.timer));
  btn.dataset.timer = String(window.setTimeout(() => delete btn.dataset.state, ms));
}

/* ---------- theme ---------- */
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) ?? (systemDark.matches ? 'dark' : 'light');
function setTheme(t: 'light' | 'dark') {
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', t === 'light' ? '#f4f5f8' : '#14171d'));
}
const toggleTheme = () => setTheme(effectiveTheme() === 'light' ? 'dark' : 'light');
$$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', toggleTheme));

/* ---------- directories mega menu ---------- */
const mega = $('[data-mega]');
const megaToggles = $$('[data-mega-toggle]');
const setMega = (open: boolean) => {
  mega?.classList.toggle('open', open);
  megaToggles.forEach((b) => b.setAttribute('aria-expanded', String(open)));
};
megaToggles.forEach((b) =>
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    setMega(!mega?.classList.contains('open'));
  })
);
document.addEventListener('click', (e) => {
  if (mega?.classList.contains('open') && !mega.contains(e.target as Node)) setMega(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mega?.classList.contains('open')) {
    setMega(false);
    megaToggles[0]?.focus();
  }
});
// Desktop: open on hover too, with a short grace period.
let megaTimer: number | undefined;
const desktopToggle = $('.nav-links [data-mega-toggle]');
if (mega && desktopToggle && matchMedia('(hover: hover)').matches) {
  const openSoon = () => { clearTimeout(megaTimer); setMega(true); };
  const closeSoon = () => { clearTimeout(megaTimer); megaTimer = window.setTimeout(() => setMega(false), 220); };
  desktopToggle.addEventListener('mouseenter', openSoon);
  desktopToggle.addEventListener('mouseleave', closeSoon);
  mega.addEventListener('mouseenter', openSoon);
  mega.addEventListener('mouseleave', closeSoon);
}

/* ---------- search icon: focus the page search if there is one ---------- */
$$('[data-search-jump]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const s = $<HTMLInputElement>('[data-search]');
    if (!s) return;
    e.preventDefault();
    s.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    s.focus({ preventScroll: true });
  })
);

/* ---------- odometer ---------- */
const STRIP = Array.from({ length: 10 }, (_, d) => `<span>${d}</span>`).join('');

function setOdo(el: HTMLElement, value: number) {
  const text = fmt(value);
  const inner = $('.odo-inner', el)!;
  const pattern = text.replace(/\d/g, 'd');
  if (inner.dataset.pattern !== pattern) {
    const old = inner.dataset.pattern;
    inner.innerHTML = text
      .split('')
      .map((ch) => (/\d/.test(ch) ? `<span class="odo-col"><span class="odo-strip">${STRIP}</span></span>` : `<span class="odo-sep">${ch}</span>`))
      .join('');
    inner.dataset.pattern = pattern;
    if (old) void inner.offsetHeight; // new columns start at 0, then roll
  }
  const digits = text.replace(/\D/g, '');
  const strips = $$('.odo-strip', inner);
  strips.forEach((s, i) => {
    s.style.transitionDelay = reduced ? '0ms' : `${(strips.length - 1 - i) * 70}ms`;
    s.style.transform = `translateY(-${digits[i]}em)`;
  });
  el.dataset.value = String(Math.round(value));
  el.dataset.rolled = '1';
  el.setAttribute('aria-label', el.getAttribute('aria-label')?.replace(/^[$\d,]+/, (m) => (m.startsWith('$') ? `$${text}` : text)) ?? text);
}

function rollIn(el: HTMLElement) {
  if (el.dataset.rolled) return;
  const inner = $('.odo-inner', el)!;
  inner.dataset.pattern = fmt(Number(el.dataset.value)).replace(/\d/g, 'd');
  const strips = $$('.odo-strip', inner);
  strips.forEach((s, i) => (s.style.transitionDelay = reduced ? '0ms' : `${(strips.length - 1 - i) * 90 + 150}ms`));
  el.dataset.rolled = '1'; // CSS holds strips at 0 until this flips
}

/* ---------- reveal on scroll ---------- */
const revealables = $$('.reveal');
const odometers = $$('[data-odometer]');
if (!('IntersectionObserver' in window) || reduced) {
  revealables.forEach((el) => el.classList.add('in'));
  odometers.forEach(rollIn);
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (el.matches('[data-odometer]')) rollIn(el);
        else el.classList.add('in');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );
  revealables.forEach((el) => io.observe(el));
  odometers.forEach((el) => io.observe(el));
}

const article = (w: string) => (/^(MCP|[aeiou])/i.test(w) ? 'an' : 'a');

/* ---------- rotating hero word ---------- */
const rot = $('[data-rotate]');
if (rot && !reduced) {
  const words = rot.dataset.rotate!.split(',');
  const hrefs = (rot.dataset.hrefs ?? '').split(',');
  const heroArticle = $('[data-article]');
  const pad = () => parseFloat(getComputedStyle(rot).fontSize) * 0.04;
  const measure = (el: HTMLElement) => `${el.getBoundingClientRect().width + pad()}px`;
  let current = $('.rot-word', rot)!;
  let i = 0;
  let laps = 0;
  let paused = false;
  const MAX_LAPS = 3; // then settle on "skill" (no endless motion)

  const tick = () => {
    if (paused || document.hidden) return;
    i = (i + 1) % words.length;
    const word = words[i];

    // Lock the current width so the change animates.
    rot.style.width = measure(current);
    const next = document.createElement('span');
    next.className = 'rot-word below';
    next.textContent = word;
    rot.appendChild(next);
    void next.offsetWidth;

    const art = article(word);
    if (heroArticle && heroArticle.textContent !== art) {
      heroArticle.classList.add('swap');
      setTimeout(() => {
        heroArticle.textContent = art;
        heroArticle.classList.remove('swap');
      }, 180);
    }
    if (hrefs[i]) rot.setAttribute('href', hrefs[i]);

    current.classList.add('above');
    next.classList.remove('below');
    rot.style.width = measure(next);

    const old = current;
    current = next;
    setTimeout(() => {
      old.remove();
      rot.style.width = '';
    }, 650);

    if (i === 0 && ++laps >= MAX_LAPS) {
      clearInterval(timer);
      delete rot.dataset.active;
    }
  };

  rot.dataset.active = '1';
  const timer = window.setInterval(tick, 2400);
  rot.closest('h1')?.addEventListener('mouseenter', () => (paused = true));
  rot.closest('h1')?.addEventListener('mouseleave', () => (paused = false));
}

/* ---------- top-N lists (home shows the top 20; the full list lives at /cancel-culture) ---------- */
function capLists() {
  $$('[data-list][data-limit]').forEach((ol) => {
    const limit = Number(ol.dataset.limit);
    ol.dataset.capped = 'true';
    let shown = 0;
    let matches = 0;
    $$(':scope > li', ol).forEach((li) => {
      if (li.classList.contains('row-hidden')) return li.classList.remove('row-capped');
      matches++;
      li.classList.toggle('row-capped', ++shown > limit);
    });
    const count = $('[data-result-count]', ol.closest('.list-card') ?? document);
    const total = ol.children.length;
    if (count) count.textContent = matches === total ? `Top ${Math.min(limit, total)} of ${total}` : `${Math.min(limit, matches)} of ${matches} matches`;
    const all = $<HTMLAnchorElement>('[data-see-all]', ol.parentElement ?? document);
    if (all) {
      all.hidden = matches <= limit;
      const url = new URL('/cancel-culture', location.origin);
      const p = new URLSearchParams(location.search);
      for (const k of ['q', 'kind']) if (p.get(k)) url.searchParams.set(k, p.get(k)!);
      all.href = url.pathname + url.search;
      const label = $('[data-see-all-label]', all);
      if (label) label.textContent = matches === total ? `See the full list · all ${total}` : `See all ${matches} matches`;
    }
  });
}

/* ---------- live search + category chips ---------- */
const list = $('[data-list]');
if (list) {
  const input = $<HTMLInputElement>('[data-search]')!;
  const rows = $$('[data-list] > li');
  const chips = $$('[data-chip]');
  const countEl = $('[data-result-count]');
  const empty = $('[data-empty]');
  const emptyQ = $('[data-empty-q]');
  const param = $('[data-chip-param]')?.dataset.chipParam ?? 'cat';
  // Pages are prerendered, so ?q= and ?cat= / ?kind= are applied here.
  const params = new URLSearchParams(location.search);
  input.value = (params.get('q') ?? '').slice(0, 80);
  let cat = params.get(param) ?? '';
  if (!chips.some((c) => c.dataset.chip === cat)) cat = '';
  chips.forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.chip ?? '') === cat)));

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    let n = 0;
    for (const li of rows) {
      const ok = (!cat || li.dataset.cat === cat) && terms.every((t) => li.dataset.search!.includes(t));
      li.classList.toggle('row-hidden', !ok);
      if (ok) {
        n++;
        li.classList.add('in');
      }
    }
    if (countEl) countEl.textContent = `${n} of ${rows.length}`;
    empty?.classList.toggle('show', n === 0);
    if (emptyQ) emptyQ.textContent = q || cat;
    const url = new URL(location.href);
    q ? url.searchParams.set('q', q) : url.searchParams.delete('q');
    cat ? url.searchParams.set(param, cat) : url.searchParams.delete(param);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    capLists();
  };

  input.addEventListener('input', apply);
  input.form?.addEventListener('submit', (e) => {
    e.preventDefault();
    apply();
    $('#list')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      apply();
    }
  });
  chips.forEach((chip) =>
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      cat = chip.dataset.chip === cat ? '' : chip.dataset.chip ?? '';
      chips.forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.chip ?? '') === cat)));
      apply();
    })
  );
  if (input.value || cat) apply();
}

capLists();

/* ---------- live numbers (pages are static; counts come from D1 via /api/counts) ---------- */
interface Totals {
  mrr: number;
  mrr24h: number;
  votes: number;
  votes24h: number;
}
interface Snapshot {
  counts: Record<string, number>;
  totals: Record<string, Totals>;
  verdicts?: Record<string, [number, number]>;
}

function showAgree(form: HTMLElement, agree: number, disagree: number) {
  const total = agree + disagree;
  const bar = $('[data-agree-bar]', form);
  const note = $('[data-agree-note]', form);
  const pct = total ? Math.round((agree / total) * 100) : 0;
  if (bar) bar.style.width = `${pct}%`;
  if (note) note.textContent = total ? `${pct}% agree · ${fmt(total)} ${total === 1 ? 'vote' : 'votes'}` : 'Be the first to weigh in.';
}

function applyCounts(data: Snapshot) {
  const count = (key: string) => data.counts[key] ?? 0;

  // Entry vote buttons and any other odometer bound to an entry.
  $$('[data-odo-key]').forEach((el) => setOdo(el, count(el.dataset.odoKey!)));
  // Plain-number spots: list rows, related cards.
  $$('[data-count-key]').forEach((el) => (el.textContent = fmt(count(el.dataset.countKey!))));

  // Agree / disagree bars on verdict cards.
  $$('form[data-verdict]').forEach((f) => {
    const v = data.verdicts?.[f.dataset.verdict!];
    if (v) showAgree(f, v[0], v[1]);
  });

  // Tickers.
  $$('[data-ticker]').forEach((t) => {
    const totals = data.totals[t.dataset.scope ?? 'all'];
    if (!totals) return;
    const odo = $('[data-odometer]', t);
    if (odo) setOdo(odo, t.dataset.metric === 'users' ? totals.votes : totals.mrr);
    const set = (k: string, v: number) => $$(`[data-total="${k}"]`, t).forEach((x) => (x.textContent = fmt(v)));
    set('mrr24h', totals.mrr24h);
    set('votes', totals.votes);
    set('votes24h', totals.votes24h);
    set('mrr12', totals.mrr * 12);
  });

  // Re-rank lists by votes (ties keep the prerendered order).
  $$('[data-list]').forEach((ol) => {
    const items = $$<HTMLLIElement>(':scope > li', ol);
    items
      .sort((a, b) => count(b.dataset.key!) - count(a.dataset.key!) || Number(a.dataset.order) - Number(b.dataset.order))
      .forEach((li, i) => {
        ol.appendChild(li);
        const r = $('.rank', li);
        if (r) r.textContent = String(i + 1).padStart(2, '0');
      });
  });
  capLists();
}

async function loadCounts() {
  try {
    const res = await fetch('/api/counts', { headers: { accept: 'application/json' } });
    if (res.ok) applyCounts(await res.json());
  } catch {}
}
if ($('[data-odo-key], [data-count-key], [data-ticker], form[data-verdict]')) {
  loadCounts();
  // Keep the ticker ticking while the tab is visible.
  window.setInterval(() => !document.hidden && loadCounts(), 30000);
}

/* ---------- status flag after a no-JS vote (?voted=…) ---------- */
{
  const p = new URLSearchParams(location.search);
  const voted = p.get('voted');
  const note = $('[data-vote-note]');
  if (voted && note) {
    note.textContent =
      voted === 'ok' ? 'Counted. Thanks!' : voted === 'already-voted' ? 'Already counted you today.' : 'Easy there. Try again later.';
    note.classList.add('flash');
  }
}

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, [contenteditable]')) return;
  if (e.key === '/') {
    const s = $<HTMLInputElement>('[data-search]');
    if (s) {
      e.preventDefault();
      s.focus();
      s.select();
    }
  } else if (e.key === 't') {
    toggleTheme();
  }
});

/* ---------- clipboard ---------- */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    return ok;
  }
}

$$('[data-copy-agent]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    const block = btn.closest('[data-prompt-block]')!;
    const prompt = $('[data-prompt]', block)!.textContent ?? '';
    const ok = await copyText((btn.dataset.prefix ?? '') + prompt);
    const hint = $('[data-copy-hint]', block);
    if (!ok) {
      toast('Copy failed: select the text manually');
      return;
    }
    confirmBtn(btn);
    if (hint) hint.textContent = btn.dataset.hint ?? '';
    toast(btn.dataset.copyAgent === 'raw' ? 'Copied the raw prompt' : `Copied for ${btn.dataset.agentName}`);
  })
);

/* ---------- install tabs + code copy ---------- */
$$('[data-tabs]').forEach((root) => {
  const tabs = $$<HTMLButtonElement>('[data-tab]', root);
  const select = (tab: HTMLButtonElement, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = $(`[data-panel="${t.dataset.tab}"]`, root);
      if (panel) on ? delete panel.dataset.hidden : (panel.dataset.hidden = 'true');
    });
    if (focus) tab.focus();
    store.set('agent', tab.dataset.tab ?? '');
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
  // Remember the visitor's agent across pages.
  const saved = tabs.find((t) => t.dataset.tab === store.get('agent'));
  if (saved) select(saved);
});

$$('[data-copy-code]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    const code = btn.closest('.code')?.querySelector('[data-code]')?.textContent ?? '';
    if (await copyText(code)) {
      confirmBtn(btn);
      toast('Copied. Paste it into your agent or terminal');
    } else toast('Copy failed: select the text manually');
  })
);

$$('[data-copy-text]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    if (await copyText(btn.dataset.copyText ?? location.href)) {
      confirmBtn(btn);
      toast('Link copied');
    }
  })
);

/* ---------- vote ---------- */
$$<HTMLFormElement>('form[data-vote]').forEach((form) => {
  const slug = form.dataset.vote!;
  const price = Number(form.dataset.price);
  const btn = $<HTMLButtonElement>('button', form)!;
  const odo = $('[data-odometer]', form)!;
  const note = $('[data-vote-note]', form.parentElement!);
  if (store.get(`voted:${slug}`)) btn.dataset.voted = 'true';

  const say = (msg: string) => {
    if (!note) return;
    note.textContent = msg;
    note.classList.remove('flash');
    void note.offsetWidth;
    note.classList.add('flash');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { accept: 'application/json', 'x-requested-with': 'fetch' } });
      const data = await res.json();
      if (typeof data.count === 'number') setOdo(odo, data.count);
      if (data.ok) loadCounts();
      if (data.ok) {
        btn.dataset.voted = 'true';
        store.set(`voted:${slug}`, String(Date.now()));
        if (price > 0) {
          say(`Counted. +${money(price)}/mo destroyed. Collective total: $${fmt(data.mrr)}/mo.`);
          toast(`+${money(price)}/mo MRR destroyed`);
        } else {
          say('Counted. Thanks for plugging in.');
          toast('Counted. Thanks!');
        }
        if (!reduced) {
          const p = document.createElement('span');
          p.className = 'plus-one';
          p.textContent = '+1';
          p.style.right = '28px';
          p.style.top = '40px';
          form.parentElement!.appendChild(p);
          p.addEventListener('animationend', () => p.remove());
        }
      } else if (data.reason === 'already-voted') {
        btn.dataset.voted = 'true';
        store.set(`voted:${slug}`, String(Date.now()));
        say('Already counted you today. Thanks for the honesty.');
      } else if (data.reason === 'rate-limited') {
        say('Easy there. Too many votes from your network; try later.');
      } else {
        say('Something went wrong. Try again?');
      }
    } catch {
      say('Network hiccup. Try again?');
    } finally {
      btn.disabled = false;
    }
  });
});

/* ---------- Submit + Advertise forms (fetch, with a no-JS POST fallback) ---------- */
const FORM_OK: Record<string, string> = {
  newsletter: 'You’re in. First email lands on Thursday.',
  alternative: 'Thanks! We’ll check it and add it to the list.',
  submit: 'Thanks! It’s in the review queue. If you left an email, we’ll tell you when it’s live.',
  advertise: 'Request received. We’ll email you to confirm the slot and send payment details.',
};
$$<HTMLFormElement>('form[data-ajax-form]').forEach((form) => {
  const kind = form.dataset.ajaxForm!;
  const msg = $('[data-form-msg]', form);
  const btn = $<HTMLButtonElement>('button[type="submit"]', form)!;
  const say = (text: string, ok: boolean) => {
    if (!msg) return;
    msg.textContent = text;
    msg.className = `form-msg ${ok ? 'ok' : 'err'}`;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json', 'x-requested-with': 'fetch' } });
      const data = await res.json();
      if (data.ok) {
        say(FORM_OK[kind], true);
        confirmBtn(btn, 3000);
        form.reset();
        toast(kind === 'submit' ? 'Submitted for review' : kind === 'newsletter' ? 'Subscribed' : kind === 'alternative' ? 'Suggestion sent' : 'Request sent');
      } else {
        say(data.error || 'Something went wrong. Try again?', false);
      }
    } catch {
      say('Network hiccup. Try again?', false);
    } finally {
      btn.disabled = false;
    }
  });
  // After a no-JS post we land back here with ?sent=…
  const sent = kind === 'newsletter' ? null : new URLSearchParams(location.search).get('sent');
  if (sent) say(sent === 'ok' ? FORM_OK[kind] : sent === 'limited' ? 'Too many tries. Give it an hour.' : 'Something was missing. Check the form and try again.', sent === 'ok');
});

// /submit?dir=mcp preselects the directory.
{
  const dir = new URLSearchParams(location.search).get('dir');
  const radio = dir ? $<HTMLInputElement>(`[data-dir-radio][value="${CSS.escape(dir)}"]`) : null;
  if (radio) radio.checked = true;
}

/* ---------- page counter ---------- */
const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
if (nav.doNotTrack !== '1' && !nav.globalPrivacyControl && 'sendBeacon' in navigator) {
  navigator.sendBeacon('/api/hit', JSON.stringify({ p: location.pathname, r: document.referrer }));
}

/* ---------- agree / disagree with a verdict ---------- */
$$<HTMLFormElement>('form[data-verdict]').forEach((form) => {
  const key = form.dataset.verdict!;
  const note = $('[data-agree-note]', form);
  if (store.get(`agree:${key}`)) form.dataset.done = 'true';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const body = new FormData();
    body.set('agree', btn?.value ?? '1');
    try {
      const res = await fetch(form.action, { method: 'POST', body, headers: { accept: 'application/json', 'x-requested-with': 'fetch' } });
      const data = await res.json();
      if (typeof data.agree === 'number') showAgree(form, data.agree, data.disagree);
      form.dataset.done = 'true';
      store.set(`agree:${key}`, btn?.value ?? '1');
      if (data.ok) toast('Thanks. Counted.');
      else if (data.reason === 'already-voted' && note) toast('You already weighed in on this one.');
      else if (data.reason === 'rate-limited') toast('Easy there. Try again later.');
    } catch {
      toast('Network hiccup. Try again?');
    }
  });
});

/* ---------- savings calculator ---------- */
$$('[data-calc]').forEach((box) => {
  const price = Number(box.dataset.calc);
  const input = $<HTMLInputElement>('[data-calc-seats]', box)!;
  const out = $('[data-calc-out]', box)!;
  const update = () => {
    const seats = Math.min(10000, Math.max(1, Math.round(Number(input.value) || 1)));
    out.textContent = `$${fmt(price * 12 * seats)}`;
  };
  input.addEventListener('input', update);
});

/* ---------- copy a terminal command (Claude Code / Codex) ---------- */
$$('[data-copy-cmd]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    if (await copyText(btn.dataset.copyCmd ?? '')) {
      confirmBtn(btn);
      toast(`Copied. Paste it in your terminal to start ${btn.dataset.label}`);
    } else toast('Copy failed: select the text manually');
  })
);

/* ---------- my stack (saved in this browser only) ---------- */
const STACK_KEY = 'stack';
const readStack = (): string[] => {
  try {
    const v = JSON.parse(store.get(STACK_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 200) : [];
  } catch {
    return [];
  }
};
const writeStack = (keys: string[]) => {
  store.set(STACK_KEY, JSON.stringify([...new Set(keys)]));
  paintStackBadge();
};
function paintStackBadge() {
  const n = readStack().length;
  $$('[data-stack-badge]').forEach((b) => {
    b.hidden = n === 0;
    b.textContent = n > 9 ? '9+' : String(n);
  });
}
paintStackBadge();

$$('[data-stack-add]').forEach((btn) => {
  const key = btn.dataset.stackAdd!;
  const paint = () => (readStack().includes(key) ? (btn.dataset.state = 'done') : delete btn.dataset.state);
  paint();
  btn.addEventListener('click', () => {
    const s = readStack();
    if (s.includes(key)) {
      writeStack(s.filter((k) => k !== key));
      toast(`Removed ${btn.dataset.stackName} from your stack`);
    } else {
      writeStack([...s, key]);
      toast(`Added ${btn.dataset.stackName}. See it in My stack`);
    }
    paint();
  });
});

{
  const el = document.getElementById('stack-data');
  if (el) {
    type Item = { n: string; s: string; k: string; w: string; p: number | null; v: string; l: string; u: string; m: string };
    const { data, picker } = JSON.parse(el.textContent ?? '{}') as { data: Record<string, Item>; picker: { slug: string; name: string; keys: string[] }[] };
    // A shared link (?s=notion,calendly) adds those apps.
    const shared = new URLSearchParams(location.search).get('s');
    if (shared) {
      const slugs = shared.split(',').slice(0, 100);
      const keys = picker.filter((p) => slugs.includes(p.slug)).map((p) => p.keys[0]);
      writeStack([...readStack(), ...keys]);
      history.replaceState(null, '', location.pathname);
    }
    const list = $('[data-stack-list]')!;
    const empty = $('[data-stack-empty]')!;
    const render = () => {
      // One row per app (slug); show its best answer across directories.
      const slugs = [...new Set(readStack().map((k) => data[k]?.s).filter(Boolean))];
      const rank: Record<string, number> = { yes: 0, kinda: 1, no: 2 };
      let total = 0;
      let save = 0;
      list.replaceChildren();
      for (const slug of slugs) {
        const app = picker.find((p) => p.slug === slug);
        if (!app) continue;
        const answers = app.keys.map((k) => data[k]).filter(Boolean);
        const best = [...answers].sort((a, b) => rank[a.v] - rank[b.v])[0];
        const price = answers.find((a) => a.p !== null)?.p ?? 0;
        total += price;
        if (best && best.v !== 'no') save += price * 12;
        const li = document.createElement('li');
        li.className = `v-${best?.v ?? 'no'}`;
        const a = document.createElement('a');
        a.href = `/compare/${slug}`;
        const name = document.createElement('strong');
        name.textContent = app.name;
        const meta = document.createElement('span');
        meta.className = 'muted';
        meta.textContent = `${price ? `$${price}/mo` : 'usage-based'} · ${answers.length} answer${answers.length === 1 ? '' : 's'}`;
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = best ? `${best.w}: ${best.l}` : '—';
        a.append(name, meta);
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'icon-btn';
        rm.setAttribute('aria-label', `Remove ${app.name}`);
        rm.textContent = '×';
        rm.addEventListener('click', () => {
          writeStack(readStack().filter((k) => !app.keys.includes(k)));
          render();
        });
        li.append(a, badge, rm);
        list.append(li);
      }
      empty.hidden = slugs.length > 0;
      $('[data-stack-total]')!.textContent = `$${fmt(total)}`;
      $('[data-stack-save]')!.textContent = `$${fmt(save)}`;
      $('[data-stack-count]')!.textContent = String(slugs.length);
    };
    const pick = $<HTMLInputElement>('[data-stack-pick]')!;
    const add = () => {
      const app = picker.find((p) => p.name.toLowerCase() === pick.value.trim().toLowerCase());
      if (!app) return;
      writeStack([...readStack(), app.keys[0]]);
      pick.value = '';
      render();
      toast(`Added ${app.name}`);
    };
    pick.addEventListener('change', add);
    pick.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), add()));
    $('[data-stack-clear]')!.addEventListener('click', () => {
      writeStack([]);
      render();
    });
    $('[data-stack-share]')!.addEventListener('click', async (e) => {
      const slugs = [...new Set(readStack().map((k) => data[k]?.s).filter(Boolean))];
      if (await copyText(`${location.origin}/stack?s=${slugs.join(',')}`)) {
        confirmBtn(e.currentTarget as HTMLElement);
        toast('Share link copied');
      }
    });
    render();
  }
}

/* ---------- stats page ---------- */
{
  const el = document.getElementById('stats-names');
  if (el) {
    const names = JSON.parse(el.textContent ?? '{}') as Record<string, { n: string; u: string; w: string; p: number }>;
    const fill = (ol: HTMLElement, rows: { key: string; n: number }[], unit: string) => {
      ol.replaceChildren();
      if (!rows.length) {
        const li = document.createElement('li');
        li.className = 'muted';
        li.textContent = 'No votes yet.';
        ol.append(li);
        return;
      }
      rows.forEach((r) => {
        const x = names[r.key];
        if (!x) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = x.u;
        a.textContent = `${x.n} `;
        const k = document.createElement('span');
        k.className = 'muted';
        k.textContent = `(${x.w})`;
        a.append(k);
        const b = document.createElement('b');
        b.textContent = `${fmt(r.n)} ${unit}`;
        li.append(a, b);
        ol.append(li);
      });
    };
    const load = async () => {
      try {
        const res = await fetch('/api/stats', { headers: { accept: 'application/json' } });
        if (!res.ok) return;
        const s = await res.json();
        const all = s.totals.all;
        const set = (k: string, v: string) => $$(`[data-stat="${k}"]`).forEach((x) => (x.textContent = v));
        set('mrr', `$${fmt(all.mrr)}`);
        set('mrr12', `$${fmt(all.mrr * 12)}`);
        set('votes', fmt(all.votes));
        set('votes24h', fmt(all.votes24h));
        for (const [k, t] of Object.entries(s.totals as Record<string, Totals>)) {
          $$(`[data-kind-votes="${k}"]`).forEach((x) => (x.textContent = fmt(t.votes)));
          $$(`[data-kind-mrr="${k}"]`).forEach((x) => (x.textContent = fmt(t.mrr)));
        }
        fill($('[data-top]')!, s.top, 'votes');
        fill($('[data-week]')!, s.week, 'this week');
        // 14-day bar chart.
        const bars = $('[data-daily]')!;
        const days: string[] = [];
        for (let i = 13; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
        const by = new Map((s.daily as { day: string; n: number }[]).map((d) => [d.day, d.n]));
        const max = Math.max(1, ...days.map((d) => by.get(d) ?? 0));
        bars.replaceChildren(
          ...days.map((d) => {
            const n = by.get(d) ?? 0;
            const col = document.createElement('span');
            col.className = 'bar';
            col.title = `${d}: ${n} votes`;
            const fillEl = document.createElement('i');
            fillEl.style.height = `${Math.max(2, (n / max) * 100)}%`;
            const lab = document.createElement('small');
            lab.textContent = d.slice(8);
            col.append(fillEl, lab);
            return col;
          })
        );
      } catch {}
    };
    load();
    window.setInterval(() => !document.hidden && load(), 60000);
  }
}

/* ---------- public review queue ---------- */
{
  const ul = $('[data-queue]');
  if (ul) {
    const when = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    fetch('/api/queue', { headers: { accept: 'application/json' } })
      .then((r) => r.json())
      .then(({ items }: { items: { id: number; directory: string; app: string; by: string | null; status: string; created_at: number }[] }) => {
        ul.replaceChildren();
        if (!items.length) {
          const li = document.createElement('li');
          li.className = 'muted';
          li.textContent = 'The queue is empty. Be the first to submit one.';
          ul.append(li);
          return;
        }
        for (const it of items) {
          const li = document.createElement('li');
          li.className = `k-${it.directory}`;
          const app = document.createElement('strong');
          app.textContent = it.app;
          const dir = document.createElement('span');
          dir.className = 'q-dir';
          dir.textContent = it.directory;
          const by = document.createElement('span');
          by.className = 'muted';
          by.textContent = `${it.by ? `@${it.by}` : 'anonymous'} · ${when(it.created_at)}`;
          const st = document.createElement('span');
          st.className = `q-status s-${it.status}`;
          st.textContent = it.status === 'new' ? 'waiting' : it.status;
          li.append(app, dir, by, st);
          ul.append(li);
        }
      })
      .catch(() => (ul.innerHTML = '<li class="muted">Couldn’t load the queue. Refresh to try again.</li>'));
  }
}

/* ---------- request an app ---------- */
{
  const ol = $('[data-requests]');
  if (ol) {
    type Req = { id: number; name: string; directory: string | null; votes: number; status: string };
    const render = (items: Req[]) => {
      ol.replaceChildren();
      if (!items.length) {
        const li = document.createElement('li');
        li.className = 'muted';
        li.textContent = 'No requests yet. Ask for the first one.';
        ol.append(li);
        return;
      }
      for (const r of items) {
        const li = document.createElement('li');
        if (r.status === 'done') li.className = 'done';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'upvote';
        btn.setAttribute('aria-label', `Vote for ${r.name}`);
        if (store.get(`req:${r.id}`)) btn.dataset.voted = 'true';
        const arrow = document.createElement('span');
        arrow.textContent = '▲';
        const n = document.createElement('b');
        n.textContent = fmt(r.votes);
        btn.append(arrow, n);
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await fetch(`/api/requests/${r.id}`, { method: 'POST', headers: { accept: 'application/json', 'x-requested-with': 'fetch' } });
            const d = await res.json();
            if (typeof d.votes === 'number') n.textContent = fmt(d.votes);
            if (d.ok || d.reason === 'already-voted') {
              btn.dataset.voted = 'true';
              store.set(`req:${r.id}`, '1');
            }
            toast(d.ok ? 'Voted' : d.reason === 'already-voted' ? 'Already voted for this one' : 'Try again later');
          } catch {
            toast('Network hiccup. Try again?');
          } finally {
            btn.disabled = false;
          }
        });
        const name = document.createElement('strong');
        name.textContent = r.name;
        const meta = document.createElement('span');
        meta.className = 'muted';
        meta.textContent = r.status === 'done' ? 'checked' : r.directory ? `wants ${r.directory}` : 'any directory';
        const text = document.createElement('span');
        text.className = 'r-text';
        text.append(name, meta);
        li.append(btn, text);
        ol.append(li);
      }
    };
    const load = () =>
      fetch('/api/requests', { headers: { accept: 'application/json' } })
        .then((r) => r.json())
        .then((d) => render(d.items))
        .catch(() => (ol.innerHTML = '<li class="muted">Couldn’t load requests. Refresh to try again.</li>'));
    load();
    const form = $<HTMLFormElement>('form[data-request-form]');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('[data-form-msg]', form);
      const btn = $<HTMLButtonElement>('button[type="submit"]', form)!;
      btn.disabled = true;
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json', 'x-requested-with': 'fetch' } });
        const d = await res.json();
        if (d.ok) {
          if (d.id) store.set(`req:${d.id}`, '1');
          form.reset();
          confirmBtn(btn, 2500);
          toast('Requested');
          if (msg) (msg.textContent = 'Added. Thanks!'), (msg.className = 'form-msg ok');
          load();
        } else if (msg) {
          msg.textContent = d.error || 'Something went wrong.';
          msg.className = 'form-msg err';
          if (d.reason === 'already-voted') load();
        }
      } catch {
        if (msg) (msg.textContent = 'Network hiccup. Try again?'), (msg.className = 'form-msg err');
      } finally {
        btn.disabled = false;
      }
    });
  }
}

/* ---------- footer pulse: live stats ---------- */
{
  const dataEl = document.getElementById('footer-data');
  const foot = $('[data-footer]');
  if (dataEl && foot) {
    const { names } = JSON.parse(dataEl.textContent ?? '{}') as { names: Record<string, { n: string; u: string; w: string }> };

    // "Last verdict added …"
    $$('[data-ago]', foot).forEach((el) => {
      const d = new Date(`${el.getAttribute('datetime')}T00:00:00`);
      const days = Math.round((Date.now() - d.getTime()) / 864e5);
      el.textContent = days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    type Pulse = { mrr: number; votes: number; counts: Record<string, number>; hot: { key: string; n: number } | null; recent: { key: string; c: string | null; ts: number }[]; now: number };
    const apply = (p: Pulse) => {
      const set = (k: string, v: string) => $$(`[data-pulse="${k}"]`, foot).forEach((x) => (x.textContent = v));
      set('mrr', `$${fmt(p.mrr)}`);
      set('votes', fmt(p.votes));
      const hot = $<HTMLAnchorElement>('[data-pulse-hot]', foot);
      if (hot && p.hot && names[p.hot.key]) {
        hot.href = names[p.hot.key].u;
        $('b', hot)!.textContent = names[p.hot.key].n;
        $('span', hot)!.textContent = `hot this week · ${fmt(p.hot.n)} ↑`;
      }
    };
    const load = async () => {
      try {
        const res = await fetch('/api/pulse', { headers: { accept: 'application/json' } });
        if (res.ok) apply(await res.json());
      } catch {}
    };
    // Only fetch once the footer is close to the viewport.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        load();
        window.setInterval(() => !document.hidden && load(), 45000);
      }
    }, { rootMargin: '600px' });
    io.observe(foot);
  }
}
