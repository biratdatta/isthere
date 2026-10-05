import { KINDS, KIND_ORDER, type Kind, type Verdict } from './kinds';

export type { Kind, Verdict } from './kinds';

export interface PriorArt {
  name: string;
  url: string;
  /** One line on what it is. Optional. */
  desc?: string;
}

export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number | null;
  note?: string;
}

interface Base {
  kind: Kind;
  slug: string;
  name: string;
  domain: string;
  category: string;
  /** Entry paid tier, USD/month. null when usage-based or not verifiable. */
  priceMonthly: number | null;
  priceNote?: string;
  pricingUrl?: string;
  verdict: Verdict;
  whatYouLose: string[];
  priorArt: PriorArt[];
  notes: string;
  /** Date the entry went live (YYYY-MM-DD). */
  added?: string;
  /** Date the price was last checked against the pricing page. */
  checked?: string;
  /** Earlier prices, oldest first. The current price is priceMonthly. */
  priceHistory?: PricePoint[];
  /** Who added it. Defaults to the maintainer. */
  contributor?: { name: string; url?: string };
}

export interface PromptEntry extends Base {
  kind: 'prompts';
  prompt: string;
}

export interface SkillEntry extends Base {
  kind: 'skills';
  skill: {
    name: string;
    /** GitHub folder of an existing skill, or null for one we wrote. */
    sourceUrl: string | null;
    /** Claude Code plugin marketplace that ships it, e.g. "anthropics/skills". */
    marketplace?: string;
    /** "<plugin>@<marketplace-name>", e.g. "document-skills@anthropic-agent-skills". */
    plugin?: string;
    /** Full SKILL.md for skills we wrote ourselves. */
    skillMd?: string;
  };
}

export interface McpEntry extends Base {
  kind: 'mcp';
  server: {
    official: boolean;
    transport: 'http' | 'stdio';
    url?: string;
    command?: string;
    args?: string[];
    env?: string[];
    auth: 'oauth' | 'api-key' | 'none';
    docsUrl?: string;
    repoUrl?: string;
  };
  tools: string[];
}

export interface PluginEntry extends Base {
  kind: 'plugins';
  plugin: {
    name: string;
    marketplace: string; // owner/repo
    marketplaceName: string; // the name after @
    repoUrl: string;
    includes: string[];
  };
}

export interface AgentEntry extends Base {
  kind: 'agents';
  agent: {
    name: string;
    maker: string;
    url: string;
    /** Short pricing line, e.g. "$0.99 per resolution" or "Pro $20/mo". */
    price: string;
    pricingUrl?: string;
    /** autonomous: runs on its own. supervised: you approve or review its steps. */
    autonomy: 'autonomous' | 'supervised';
    does: string[];
    openSource?: boolean;
    repoUrl?: string;
  };
}

export type Entry = PromptEntry | SkillEntry | McpEntry | PluginEntry | AgentEntry;

export const CATEGORIES: Record<string, { label: string; desc: string }> = {
  productivity: { label: "Productivity", desc: "Calendars, timers, whiteboards and the apps that run your day." },
  notes: { label: "Notes & wikis", desc: "Docs, wikis and second brains." },
  'project-management': { label: "Projects & tasks", desc: "Boards, issues, to-dos and sprints." },
  marketing: { label: "Marketing", desc: "Copy, campaigns and content at scale." },
  seo: { label: "SEO", desc: "Rankings, backlinks and site audits." },
  social: { label: "Social media", desc: "Scheduling and posting to social networks." },
  'email-marketing': { label: "Email marketing", desc: "Newsletters, lists and automations." },
  sales: { label: "Sales", desc: "Prospecting, outreach and pipeline." },
  support: { label: "Support", desc: "Help desks, tickets and live chat." },
  communication: { label: "Communication", desc: "Email, calls, video and messaging." },
  scheduling: { label: "Scheduling", desc: "Booking links and meeting times." },
  writing: { label: "Writing", desc: "Grammar, tone and editing." },
  documents: { label: "Documents", desc: "PDFs, e-signatures and file sharing." },
  presentations: { label: "Presentations", desc: "Slides and decks." },
  design: { label: "Design", desc: "Graphics, UI and brand assets." },
  web: { label: "Websites & links", desc: "Site builders, link shorteners and bio pages." },
  forms: { label: "Forms", desc: "Surveys, quizzes and sign-ups." },
  analytics: { label: "Analytics", desc: "Traffic, dashboards and product analytics." },
  data: { label: "Data & research", desc: "Spreadsheets, BI and company data." },
  automation: { label: "Automation", desc: "Zaps, workflows and glue between apps." },
  'dev-tools': { label: "Dev tools", desc: "Code hosting, contractors and developer services." },
  'code-review': { label: "Code review", desc: "Automated pull-request review." },
  testing: { label: "Testing & QA", desc: "Browser, device and end-to-end testing." },
  'internal-tools': { label: "Internal tools", desc: "Admin panels and dashboards for your team." },
  monitoring: { label: "Monitoring", desc: "Uptime, errors and status pages." },
  security: { label: "Security", desc: "Passwords, secrets and vulnerability scans." },
  finance: { label: "Finance", desc: "Bookkeeping, invoicing and expenses." },
  payments: { label: "Payments", desc: "Checkout, billing and subscriptions." },
  legal: { label: "Legal", desc: "Contracts, compliance and legal docs." },
};

/* ---------------- validation ---------------- */

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function validate(raw: unknown, file: string, kind: Kind): Entry {
  const a = raw as Record<string, any>;
  const fail = (m: string): never => {
    throw new Error(`[data/${kind}] ${file}: ${m}`);
  };
  for (const k of ['slug', 'name', 'domain', 'category', 'notes']) {
    if (typeof a[k] !== 'string' || !a[k].trim()) fail(`"${k}" must be a non-empty string`);
  }
  if (!SLUG_RE.test(a.slug)) fail('slug must be lowercase kebab-case');
  if (!file.endsWith(`/${a.slug}.json`)) fail('file name must match slug');
  if (!CATEGORIES[a.category]) fail(`unknown category "${a.category}" (add it to CATEGORIES)`);
  if (!(a.priceMonthly === null || (typeof a.priceMonthly === 'number' && a.priceMonthly >= 0))) fail('priceMonthly must be a number >= 0 or null');
  if (!['yes', 'kinda', 'no'].includes(a.verdict)) fail('verdict must be yes|kinda|no');
  if (!Array.isArray(a.whatYouLose) || a.whatYouLose.some((x: unknown) => typeof x !== 'string')) fail('whatYouLose must be string[]');
  if (!Array.isArray(a.priorArt) || a.priorArt.some((p: any) => !p?.name || !/^https?:\/\//.test(p?.url ?? ''))) fail('priorArt must be {name,url}[]');

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  for (const k of ['added', 'checked']) if (a[k] !== undefined && !DATE_RE.test(a[k])) fail(`${k} must be YYYY-MM-DD`);
  if (a.priceHistory !== undefined && (!Array.isArray(a.priceHistory) || a.priceHistory.some((p: any) => !DATE_RE.test(p?.date ?? '') || !(p.price === null || typeof p.price === 'number')))) {
    fail('priceHistory must be [{date: YYYY-MM-DD, price: number|null, note?}]');
  }
  if (a.contributor !== undefined && (typeof a.contributor?.name !== 'string' || !a.contributor.name.trim())) fail('contributor needs a name');

  if (kind === 'prompts' && typeof a.prompt !== 'string') fail('prompts need "prompt"');
  if (kind === 'skills') {
    const s = a.skill;
    if (!s?.name) fail('skills need skill.name');
    if (!s.skillMd && !s.sourceUrl) fail('skills need skill.skillMd or skill.sourceUrl');
  }
  if (kind === 'mcp') {
    const s = a.server;
    if (!s || !['http', 'stdio'].includes(s.transport)) fail('mcp needs server.transport http|stdio');
    if (s.transport === 'http' && !/^https?:\/\//.test(s.url ?? '')) fail('http server needs server.url');
    if (s.transport === 'stdio' && !s.command) fail('stdio server needs server.command');
    if (!Array.isArray(a.tools)) fail('mcp needs tools[]');
  }
  if (kind === 'plugins') {
    const p = a.plugin;
    if (!p?.name || !p.marketplace || !p.marketplaceName || !p.repoUrl || !Array.isArray(p.includes)) {
      fail('plugins need plugin {name, marketplace, marketplaceName, repoUrl, includes[]}');
    }
  }
  if (kind === 'agents') {
    const g = a.agent;
    if (!g?.name || !g.maker || !/^https?:\/\//.test(g.url ?? '') || !g.price || !['autonomous', 'supervised'].includes(g.autonomy) || !Array.isArray(g.does)) {
      fail('agents need agent {name, maker, url, price, autonomy autonomous|supervised, does[]}');
    }
  }
  return { ...a, kind } as Entry;
}

const modules = import.meta.glob('../../data/{skills,mcp,plugins,prompts,agents}/*.json', { eager: true, import: 'default' });

export const ENTRIES: Entry[] = Object.entries(modules)
  .map(([file, mod]) => {
    const kind = file.split('/').slice(-2)[0] as Kind;
    return validate(mod, file, kind);
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const byKind = (kind: Kind) => ENTRIES.filter((e) => e.kind === kind);

const INDEX = new Map(ENTRIES.map((e) => [`${e.kind}:${e.slug}`, e]));
export const getEntry = (kind: Kind, slug: string) => INDEX.get(`${kind}:${slug}`);
export const keyOf = (e: Pick<Entry, 'kind' | 'slug'>) => `${e.kind}:${e.slug}`;

/** Same app in the other directories, in directory order. */
export function siblings(e: Entry): Entry[] {
  return KIND_ORDER.filter((k) => k !== e.kind)
    .map((k) => getEntry(k, e.slug))
    .filter((x): x is Entry => !!x);
}

/** Any entry with this slug (used for favicons, which only need the domain). */
export const anyBySlug = (slug: string) => ENTRIES.find((e) => e.slug === slug);

/* ---------------- formatting ---------------- */

export function formatPrice(n: number | null): string {
  if (n === null) return '—';
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Stock-ticker style symbol: NOTION -> NTN, CALENDLY -> CLND */
export function tickerSymbol(e: Pick<Entry, 'name'>): string {
  const s = e.name.toUpperCase().replace(/\(.*?\)/g, '').replace(/[^A-Z0-9]/g, '');
  return (s[0] + s.slice(1).replace(/[AEIOU]/g, '')).slice(0, 4);
}

export function categoryCounts(entries: Entry[]) {
  return Object.entries(CATEGORIES)
    .map(([key, c]) => ({ key, ...c, count: entries.filter((a) => a.category === key).length }))
    .filter((c) => c.count > 0);
}

export function relatedEntries(e: Entry, n = 3): Entry[] {
  const rank = { yes: 0, kinda: 1, no: 2 } as const;
  return byKind(e.kind)
    .filter((a) => a.slug !== e.slug)
    .map((a) => ({
      a,
      score: (a.category === e.category ? 10 : 0) + (a.verdict === e.verdict ? 3 : 0) - Math.abs((a.priceMonthly ?? 0) - (e.priceMonthly ?? 0)) / 100,
    }))
    .sort((x, y) => y.score - x.score || rank[x.a.verdict] - rank[y.a.verdict])
    .slice(0, n)
    .map((x) => x.a);
}

export function searchText(e: Entry): string {
  const c = CATEGORIES[e.category];
  const k = KINDS[e.kind];
  const extra =
    e.kind === 'skills' ? [e.skill.name] : e.kind === 'plugins' ? [e.plugin.name] : e.kind === 'mcp' ? e.tools : e.kind === 'agents' ? [e.agent.name, e.agent.maker] : [];
  return [e.name, e.slug, e.domain, c.label, k.word, k.plural, k.verdicts[e.verdict].label, ...e.priorArt.map((p) => p.name), ...extra]
    .join(' ')
    .toLowerCase();
}

export const verdictLabel = (e: Entry) => KINDS[e.kind].verdicts[e.verdict].label;

/* ---------------- cross-directory helpers ---------------- */

export const LAUNCH_DATE = '2026-10-04';
export const MAINTAINER = { name: 'biratdatta', url: 'https://github.com/biratdatta' };
export const addedOn = (e: Entry) => e.added ?? LAUNCH_DATE;
export const contributorOf = (e: Entry) => e.contributor ?? MAINTAINER;

/** One row per app (slug), with every directory that covers it. */
export function apps() {
  const map = new Map<string, Entry[]>();
  for (const e of ENTRIES) map.set(e.slug, [...(map.get(e.slug) ?? []), e]);
  return [...map.entries()]
    .map(([slug, list]) => ({ slug, name: list[0].name, domain: list[0].domain, category: list[0].category, entries: KIND_ORDER.map((k) => list.find((x) => x.kind === k)).filter((x): x is Entry => !!x) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Most recent price change, if the entry has a history and the price moved. */
export function lastPriceChange(e: Entry): { from: number | null; to: number | null; date: string; note?: string } | undefined {
  const h = e.priceHistory;
  if (!h?.length) return undefined;
  const prev = h[h.length - 1];
  if (prev.price === e.priceMonthly) return undefined;
  return { from: prev.price, to: e.priceMonthly, date: e.checked ?? addedOn(e), note: prev.note };
}

/** Free / open-source alternatives across every directory entry for this app, deduplicated by URL. */
export function freeAlternatives(slug: string): PriorArt[] {
  const seen = new Map<string, PriorArt>();
  for (const e of ENTRIES.filter((x) => x.slug === slug)) for (const p of e.priorArt) if (!seen.has(p.url)) seen.set(p.url, p);
  return [...seen.values()];
}

/** Per-category summary for the hub, the home row and category pages. Sorted by how much is covered. */
export function categoryStats() {
  return Object.entries(CATEGORIES)
    .map(([key, c]) => {
      const entries = ENTRIES.filter((e) => e.category === key);
      const bySlug = new Map<string, Entry[]>();
      for (const e of entries) bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);
      const appsList = [...bySlug.values()];
      const monthly = appsList.reduce((s, list) => s + (list.find((e) => e.priceMonthly !== null)?.priceMonthly ?? 0), 0);
      // "Replaceable" = a YES in a directory that replaces the app (MCP's OFFICIAL means it connects, not replaces).
      const replaceable = appsList.filter((list) => list.some((e) => e.verdict === 'yes' && KINDS[e.kind].metric === 'mrr')).length;
      return {
        key,
        ...c,
        entries,
        apps: appsList.length,
        monthly: Math.round(monthly * 100) / 100,
        replaceable,
        kinds: KIND_ORDER.filter((k) => entries.some((e) => e.kind === k)),
        keys: entries.map(keyOf),
      };
    })
    .filter((c) => c.entries.length > 0)
    .sort((a, b) => b.entries.length - a.entries.length || b.monthly - a.monthly || a.label.localeCompare(b.label));
}
