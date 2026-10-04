/**
 * The five directories. Each one answers a different "Is there a ___ for it?" question,
 * with its own verdict wording, vote meaning and headline metric.
 */
export type Kind = 'skills' | 'mcp' | 'plugins' | 'prompts' | 'agents';
export type Verdict = 'yes' | 'kinda' | 'no';

export interface KindConfig {
  id: Kind;
  word: string; // "skill", "MCP"…
  article: 'a' | 'an';
  plural: string; // "Skills"
  emoji: string;
  short: string; // 3-letter tape suffix
  /** Long-name subdomains that 301 to this directory, e.g. isthereaskillforit.biratdatta.tech */
  vanity: string[];
  lede: string;
  /** One short line for menus and tiles. */
  tagline: string;
  /** "mrr": price × votes counts as MRR destroyed. "users": votes are just "I use this". */
  metric: 'mrr' | 'users';
  vote: string;
  voted: string;
  listTitle: string;
  listEyebrow: string;
  entryTitle: (name: string) => string;
  verdicts: Record<Verdict, { label: string; headline: string; blurb: string }>;
}

export const KINDS: Record<Kind, KindConfig> = {
  skills: {
    id: 'skills',
    tagline: 'SKILL.md packs that do the job a subscription used to.',
    word: 'skill',
    article: 'a',
    plural: 'Skills',
    emoji: '🧠',
    short: 'SKL',
    vanity: ['isthereaskillforit'],
    lede: 'Agent Skills (a folder with a SKILL.md) that do the job a subscription used to. Install once, works in Claude Code, Codex and Cursor.',
    metric: 'mrr',
    vote: 'I replaced this',
    voted: 'replaced',
    listTitle: 'Cancel Culture',
    listEyebrow: 'ranked by "I replaced this"',
    entryTitle: (n) => `Is there a skill for ${n}?`,
    verdicts: {
      yes: { label: 'YES', headline: 'Yes. A skill does the job.', blurb: 'Install the skill and cancel the subscription for the work you actually use it for.' },
      kinda: { label: 'KINDA', headline: 'Kinda. The skill covers the core.', blurb: 'It handles the main job well; the app’s UI, integrations or hosted extras are what you give up.' },
      no: { label: 'NOT REALLY', headline: 'Not really. A skill can’t do the important part.', blurb: 'The skill helps around the edges, but the core of the product needs something a skill can’t provide.' },
    },
  },
  mcp: {
    id: 'mcp',
    tagline: 'Servers that let your agent drive the app for you.',
    word: 'MCP',
    article: 'an',
    plural: 'MCPs',
    emoji: '🔌',
    short: 'MCP',
    vanity: ['isthereanmcpforit', 'isthereamcpforit'],
    lede: 'MCP servers that let your agent drive the app for you: read, search, create and update without opening the UI.',
    metric: 'users',
    vote: 'I use this',
    voted: 'use it',
    listTitle: 'Most plugged-in',
    listEyebrow: 'ranked by "I use this"',
    entryTitle: (n) => `Is there an MCP for ${n}?`,
    verdicts: {
      yes: { label: 'OFFICIAL', headline: 'Yes. There’s an official MCP server.', blurb: 'Run by the vendor. Connect it to your agent in one command.' },
      kinda: { label: 'COMMUNITY', headline: 'Kinda. A community server exists.', blurb: 'Not maintained by the vendor. Check the code and the permissions before you connect it.' },
      no: { label: 'NOT YET', headline: 'Not yet. No MCP server we can vouch for.', blurb: 'Nothing official, and nothing from the community we’d recommend.' },
    },
  },
  plugins: {
    id: 'plugins',
    tagline: 'Bundles of skills, commands and connectors that replace a workflow.',
    word: 'plugin',
    article: 'a',
    plural: 'Plugins',
    emoji: '🧩',
    short: 'PLG',
    vanity: ['isthereapluginforit'],
    lede: 'Agent plugins: installable bundles of skills, commands, subagents and MCP connectors that replace a whole SaaS workflow.',
    metric: 'mrr',
    vote: 'I replaced this',
    voted: 'replaced',
    listTitle: 'Cancel Culture',
    listEyebrow: 'ranked by "I replaced this"',
    entryTitle: (n) => `Is there a plugin for ${n}?`,
    verdicts: {
      yes: { label: 'YES', headline: 'Yes. A plugin replaces it.', blurb: 'Install the plugin and the workflow comes with it.' },
      kinda: { label: 'KINDA', headline: 'Kinda. The plugin covers the core workflow.', blurb: 'You get the main job done in your agent; always-on automation, UI and integrations are what you lose.' },
      no: { label: 'NOT REALLY', headline: 'Not really. Keep paying.', blurb: 'No plugin we know of does the part that matters.' },
    },
  },
  prompts: {
    id: 'prompts',
    tagline: 'One-shot build prompts for Claude Code, Codex and Cursor.',
    word: 'prompt',
    article: 'a',
    plural: 'Prompts',
    emoji: '⌨️',
    short: 'PRM',
    vanity: ['isthereapromptforit'],
    lede: 'One-shot build prompts: paste into Claude Code, Codex or Cursor and build your own version of the app.',
    metric: 'mrr',
    vote: 'I replaced this',
    voted: 'replaced',
    listTitle: 'Cancel Culture',
    listEyebrow: 'ranked by "I replaced this"',
    entryTitle: (n) => `Can you replace ${n} with one AI prompt?`,
    verdicts: {
      yes: { label: 'YES', headline: 'Yes. One prompt gets you there.', blurb: 'A coding agent can rebuild the part you actually use in a single session.' },
      kinda: { label: 'KINDA', headline: 'Kinda. You get the core, not the moat.', blurb: 'The core workflow is buildable. The infrastructure, integrations or polish are what you are paying for.' },
      no: { label: 'NOT REALLY', headline: 'Not really. Keep paying (or self-host the open-source one).', blurb: 'The hard part is not code: it is infrastructure, trust, compliance or network effects.' },
    },
  },
  agents: {
    id: 'agents',
    tagline: 'AI agents that do the job you pay a SaaS (or a person) for.',
    word: 'agent',
    article: 'an',
    plural: 'Agents',
    emoji: '🤖',
    short: 'AGT',
    vanity: ['isthereanagentforit'],
    lede: 'AI agents that do the work a SaaS app helps you do: answer the tickets, book the meetings, keep the books. Hire the agent, cancel the seat.',
    metric: 'mrr',
    vote: 'I replaced this',
    voted: 'replaced',
    listTitle: 'Cancel Culture',
    listEyebrow: 'ranked by "I replaced this"',
    entryTitle: (n) => `Is there an agent for ${n}?`,
    verdicts: {
      yes: { label: 'YES', headline: 'Yes. An agent does the job.', blurb: 'Hand the work to the agent and cancel the subscription.' },
      kinda: { label: 'KINDA', headline: 'Kinda. The agent does the core work.', blurb: 'It handles the main job on its own; control, coverage or the app’s ecosystem are what you give up.' },
      no: { label: 'NOT REALLY', headline: 'Not really. Keep paying.', blurb: 'No agent we know of does the part that matters reliably.' },
    },
  },
};

export const KIND_ORDER: Kind[] = ['skills', 'mcp', 'plugins', 'prompts', 'agents'];
export const isKind = (s: string | undefined): s is Kind => !!s && s in KINDS;
