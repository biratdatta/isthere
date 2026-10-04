import { CATEGORIES, formatPrice, type Entry } from './apps';
import { KINDS, KIND_ORDER } from './kinds';

export const SITE_NAME = 'Is there a skill for it?';
export const SITE_TAGLINE = 'Is there a skill, an MCP, a plugin or a prompt that replaces the SaaS you pay for?';
export const REPO_URL = process.env.REPO_URL || 'https://github.com/biratdatta/isthere';

export const abs = (site: URL, p: string) => new URL(p, site).toString();
export const entryPath = (e: Pick<Entry, 'kind' | 'slug'>) => `/${e.kind}/${e.slug}`;

export function organization(site: URL) {
  return {
    '@type': 'Organization',
    '@id': abs(site, '/#org'),
    name: SITE_NAME,
    url: abs(site, '/'),
    logo: abs(site, '/favicon.svg'),
    sameAs: [REPO_URL],
  };
}

export function website(site: URL) {
  return {
    '@type': 'WebSite',
    '@id': abs(site, '/#website'),
    name: SITE_NAME,
    description: SITE_TAGLINE,
    url: abs(site, '/'),
    publisher: { '@id': abs(site, '/#org') },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs(site, '/?q={search_term_string}') },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function itemList(site: URL, name: string, items: { name: string; path: string }[]) {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(site, it.path), name: it.name })),
  };
}

export function breadcrumbs(site: URL, items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(site, it.path) })),
  };
}

export function entryTitle(e: Entry) {
  return KINDS[e.kind].entryTitle(e.name);
}

export function entryDescription(e: Entry) {
  const k = KINDS[e.kind];
  const c = CATEGORIES[e.category];
  const price = e.priceMonthly !== null ? `, from ${formatPrice(e.priceMonthly)}/mo` : '';
  return `${e.name} (${c.label}${price}): ${k.verdicts[e.verdict].label}. ${e.notes}`.slice(0, 300);
}

function agentsAnswer(e: Entry): string {
  switch (e.kind) {
    case 'skills':
      return `Claude Code, OpenAI Codex and Cursor all read Agent Skills (a folder with a SKILL.md). Pick your agent on this page and copy the install command; it puts the skill where that agent looks for it.`;
    case 'mcp':
      return `Any MCP client. This page has the exact setup for Claude Code (claude mcp add), OpenAI Codex (codex mcp add) and Cursor (mcp.json).`;
    case 'plugins':
      return `This plugin is published for Claude Code's plugin marketplaces. Codex and Cursor have their own plugin systems, so look for an equivalent there, or use the skills and MCP connectors it bundles directly.`;
    case 'prompts':
      return `Any capable coding agent: Claude Code, OpenAI Codex or Cursor in Agent mode. Each copy button adds run instructions for that tool in front of the prompt.`;
  }
}

export function faqFor(e: Entry): { q: string; a: string }[] {
  const k = KINDS[e.kind];
  const v = k.verdicts[e.verdict];
  const lose = e.whatYouLose.map((s) => s.replace(/\.$/, '')).join('; ');
  const faq = [
    { q: k.entryTitle(e.name), a: `${v.headline} ${e.notes}` },
    {
      q: e.kind === 'mcp' ? `What are the limitations of the ${e.name} MCP server?` : `What do you lose if you replace ${e.name} with ${k.article} ${k.word}?`,
      a: lose ? `Honestly: ${lose}.` : 'Very little for a single user.',
    },
  ];
  if (k.metric === 'mrr') {
    faq.push({
      q: `How much does replacing ${e.name} save?`,
      a:
        e.priceMonthly !== null
          ? `${e.name}'s entry paid plan is about ${formatPrice(e.priceMonthly)}/month (${formatPrice(e.priceMonthly * 12)}/year)${e.priceNote ? ` (${e.priceNote})` : ''}. ${k.word === 'prompt' ? 'A self-built version typically runs on a free tier or a $5/month server' : `The ${k.word} itself is free; you pay only for your AI agent`}, minus the time you spend on it.`
          : `${e.name} doesn't have a simple per-seat price${e.priceNote ? ` (${e.priceNote})` : ''}. Check its pricing page against your usage.`,
    });
  } else {
    faq.push({
      q: `How do I connect ${e.name} to my AI agent?`,
      a:
        e.kind === 'mcp' && e.server.transport === 'http'
          ? `Add the remote server ${e.server.url} to your agent${e.server.auth === 'oauth' ? ' and sign in with OAuth when prompted' : ''}. The commands for Claude Code, Codex and Cursor are on this page.`
          : `Run the server locally and register it with your agent. The commands for Claude Code, Codex and Cursor are on this page.`,
    });
  }
  faq.push({ q: `Which AI agents work with this ${k.word}?`, a: agentsAnswer(e) });
  return faq;
}

export function faqPage(qas: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: qas.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/** Serialize JSON-LD safely for inline <script>. */
export function ldJson(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export const directoryItems = () => KIND_ORDER.map((k) => ({ name: `Is there ${KINDS[k].article} ${KINDS[k].word} for it?`, path: `/${k}` }));
