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
}

function applyCounts(data: Snapshot) {
  const count = (key: string) => data.counts[key] ?? 0;

  // Entry vote buttons and any other odometer bound to an entry.
  $$('[data-odo-key]').forEach((el) => setOdo(el, count(el.dataset.odoKey!)));
  // Plain-number spots: list rows, related cards.
  $$('[data-count-key]').forEach((el) => (el.textContent = fmt(count(el.dataset.countKey!))));

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
}

async function loadCounts() {
  try {
    const res = await fetch('/api/counts', { headers: { accept: 'application/json' } });
    if (res.ok) applyCounts(await res.json());
  } catch {}
}
if ($('[data-odo-key], [data-count-key], [data-ticker]')) {
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
        toast(kind === 'submit' ? 'Submitted for review' : 'Request sent');
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
  const sent = new URLSearchParams(location.search).get('sent');
  if (sent) say(sent === 'ok' ? FORM_OK[kind] : sent === 'limited' ? 'Too many tries. Give it an hour.' : 'Something was missing. Check the form and try again.', sent === 'ok');
});

// /submit?dir=mcp preselects the directory.
{
  const dir = new URLSearchParams(location.search).get('dir');
  const radio = dir ? $<HTMLInputElement>(`[data-dir-radio][value="${CSS.escape(dir)}"]`) : null;
  if (radio) radio.checked = true;
}

/* ---------- first-party analytics (cookieless, honors DNT/GPC) ---------- */
const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
if (nav.doNotTrack !== '1' && !nav.globalPrivacyControl && 'sendBeacon' in navigator) {
  navigator.sendBeacon('/api/hit', JSON.stringify({ p: location.pathname, r: document.referrer }));
}
