# Is there a skill for it?

Four directories at **isthere.biratdatta.com**, one question per paid SaaS app: is there a ___ for it?

| Directory | Path | Question | Verdicts | Vote |
| --- | --- | --- | --- | --- |
| 🧠 Skills | `/skills` | Can an Agent Skill (SKILL.md) replace it? | YES / KINDA / NOT REALLY | I replaced this |
| 🔌 MCPs | `/mcp` | Is there an MCP server so your agent can drive it? | OFFICIAL / COMMUNITY / NOT YET | I use this |
| 🧩 Plugins | `/plugins` | Can an agent plugin replace the workflow? | YES / KINDA / NOT REALLY | I replaced this |
| ⌨️ Prompts | `/prompts` | Can one AI coding prompt rebuild it? | YES / KINDA / NOT REALLY | I replaced this |

Every entry has a blunt verdict, copy-paste installs for Claude Code, Codex and Cursor, an honest
"what you lose" list, and a vote counter. Votes on skills, plugins and prompts feed the **COLLECTIVE MRR
DESTROYED** ticker. The same app can appear in several directories, and entries link to each other.

The original site was built from a single prompt, which lives in [`data/rebuild-prompt.md`](data/rebuild-prompt.md)
and is served at `/rebuild`.

### Domains

- `isthere.biratdatta.com` is canonical (`SITE_URL`).
- `isthereaskillforit`, `isthereanmcpforit` / `isthereamcpforit`, `isthereapluginforit` and
  `isthereapromptforit` `.biratdatta.com` are short links: point them at the same server (a wildcard
  `*.biratdatta.com` DNS record works) and the middleware 301s them to the matching directory.
  `isthereanmcpforit.biratdatta.com/notion` → `/mcp/notion`.
- Old `/notion`-style URLs 301 to `/prompts/notion`.

## Stack

- Astro 7, `output: 'server'`, `@astrojs/node` (standalone)
- better-sqlite3 for votes, waitlist, rate limits, favicon cache and first-party analytics
- Vanilla JS (`src/scripts/main.ts`), no client framework
- JetBrains Mono + Space Grotesk, self-hosted via Fontsource (no Google Fonts requests)
- OG images rendered at build time with satori + resvg (`scripts/og.mjs`)

## Run it

```bash
npm install
npm run seed:demo   # optional: fake votes so the Death List isn't empty (local only)
npm run dev         # http://localhost:4321
```

Production:

```bash
npm run build       # generates OG images, then builds
SITE_URL=https://your.domain DB_PATH=/var/lib/skill/site.sqlite npm start
```

See `.env.example` for all settings. Set `TRUST_PROXY=1` behind a reverse proxy so rate limits see real client IPs.
Keep `DB_PATH` on a persistent volume.

## Adding an entry

One JSON file per app per directory: `data/<skills|mcp|plugins|prompts>/<slug>.json`. Use the same slug
for the same app across directories so they cross-link.

Shared fields:

```json
{
  "slug": "notion",
  "name": "Notion",
  "domain": "notion.so",
  "category": "productivity",
  "priceMonthly": 10,
  "priceNote": "Plus, billed yearly",
  "pricingUrl": "https://www.notion.com/pricing",
  "verdict": "yes",
  "whatYouLose": ["…"],
  "priorArt": [{ "name": "…", "url": "https://…" }],
  "notes": "…"
}
```

Plus one directory-specific block:

- **prompts**: `"prompt": "Build a …"`
- **skills**: `"skill": { "name": "pdf", "sourceUrl": "https://github.com/anthropics/skills/tree/main/skills/pdf", "marketplace": "anthropics/skills", "plugin": "document-skills@anthropic-agent-skills" }`,
  or for a skill written here: `"skill": { "name": "copyedit", "sourceUrl": null, "skillMd": "---\nname: copyedit\n…" }`
- **mcp**: `"server": { "official": true, "transport": "http", "url": "https://mcp.notion.com/mcp", "auth": "oauth", "docsUrl": "…" }, "tools": ["…"]`
  (stdio servers use `"command"`, `"args"` and optional `"env": ["API_KEY"]`)
- **plugins**: `"plugin": { "name": "code-review", "marketplace": "anthropics/claude-plugins-official", "marketplaceName": "claude-plugins-official", "repoUrl": "…", "includes": ["…"] }`

Install snippets for Claude Code, Codex and Cursor are generated from these fields in `src/lib/installs.ts`.

- `category` must be a key in `CATEGORIES` (`src/lib/apps.ts`), which also holds the chip emoji.
- `priceMonthly` is the entry paid tier per seat, or `null` when usage-based or unverifiable (explain in `priceNote`). Prices drift; PRs welcome.
- `npm run check-data` validates every file (also runs in CI). The site refuses to build with invalid data.

## How things work

| Feature | Where |
| --- | --- |
| Directory config (words, verdict labels, vote meaning, vanity hosts) | `src/lib/kinds.ts` |
| Shared home, directory pages, entry pages | `src/pages/index.astro`, `src/components/Directory.astro`, `src/pages/[kind]/[slug].astro` |
| Ranked lists, live search, chips | `src/components/EntryList.astro`, `SearchChips.astro`, `src/scripts/main.ts` (server-rendered; `?q=`, `?cat=`, `?kind=` work without JS) |
| Tickers: Σ price × votes (or "I use this" for MCPs), odometer + tape | `src/components/Ticker.astro`, `Odometer.astro`, `Tape.astro` |
| Per-agent installs and prompt prefixes | `src/lib/installs.ts`, `src/lib/agents.ts`, `src/components/InstallBlock.astro` |
| Vanity subdomain redirects, legacy URL redirects | `src/middleware.ts`, `src/pages/[slug].astro` |
| Votes: 1 per entry per IP per 24h, max 20/hour per IP | `src/lib/db.ts` → `castVote`, keyed `kind:slug` (IPs are salted + hashed, never stored raw; old databases are migrated automatically) |
| Waitlist: honeypot, dedupe (case-insensitive), 5/hour per IP | `src/pages/api/waitlist.ts` |
| Favicons proxied server-side and cached in SQLite | `src/pages/api/favicon/[slug].ts` |
| JSON-LD: WebSite+SearchAction, Organization, ItemList, BreadcrumbList, FAQPage | `src/lib/seo.ts` |
| sitemap.xml, robots.txt | `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts` |

All forms and the vote button work without JavaScript (POST + redirect). With JS they upgrade to fetch.

## Privacy

No accounts, no payments, no cookies, no third-party scripts, fonts or icon services in the browser.
Analytics is a single first-party beacon (`/api/hit`) that stores `(day, path, referrer host, count)`; it is skipped
when Do Not Track or Global Privacy Control is on. Query it with:

```bash
sqlite3 data/db/site.sqlite "SELECT path, SUM(n) FROM hits GROUP BY path ORDER BY 2 DESC LIMIT 20;"
```

## Motion

Odometer rolls, hover lifts, press scales, copy confirmations and reveal-on-scroll are CSS transitions driven by
small vanilla JS. Everything collapses to instant under `prefers-reduced-motion: reduce`, and the scrolling tape
becomes a static, horizontally scrollable strip.

## License

MIT. See [LICENSE](LICENSE). Verdicts are opinions; trademarks belong to their owners.
