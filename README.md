# Is there a skill for it?

Four directories at **isthere.biratdatta.tech**, one question per paid SaaS app: is there a ___ for it?

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

## Stack

- Astro 7 on **Cloudflare Workers** (`@astrojs/cloudflare`). Every page is prerendered to static HTML;
  only the API routes (`/api/*`) run in the Worker.
- **Cloudflare D1** (serverless SQLite) for votes, waitlist, rate limits, favicon cache and first-party analytics.
  Pages fetch live numbers from `/api/counts` and roll the odometers on load.
- Vanilla JS (`src/scripts/main.ts`), no client framework
- JetBrains Mono + Space Grotesk, self-hosted via Fontsource (no Google Fonts requests)
- OG images rendered at build time with satori + resvg (`scripts/og.mjs`)

Everything fits Cloudflare's free plan: static assets are free and unlimited, and the Worker + D1 free
allowances (100k requests/day, 5M D1 rows read/day, 100k written/day) are far above what this site needs.

## Run it locally

```bash
npm install
npm run seed:demo   # optional: fake votes in the LOCAL D1 database
npm run dev         # http://localhost:4321
```

`npm run dev` uses a local D1 database stored in `.wrangler/`. Tables are created automatically on first use.

## Deploy to Cloudflare

One-time setup (the domain `biratdatta.tech` must already be active in your Cloudflare account):

1. **Workers & Pages → Create → Import a repository**, pick `biratdatta/isthere`.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
2. The first deploy creates the D1 database `isthere` and attaches `isthere.biratdatta.tech`
   (both come from `wrangler.jsonc`). The tables are created on the first request.
3. Every `git push` to `main` redeploys.

If a deploy ever complains that the D1 database has no `database_id`, create it yourself with
`npx wrangler d1 create isthere` and paste the printed id into `wrangler.jsonc`.

Or from your machine: `npx wrangler login` once, then `npm run deploy`.

### Domains

- `isthere.biratdatta.tech` is canonical (`site` in `astro.config.mjs`, `SITE_HOST` in `src/lib/seo.ts`).
- Short links, done with **Rules → Redirect Rules** in the Cloudflare dashboard (free plan allows 10):
  for each of `isthereaskillforit`, `isthereanmcpforit`, `isthereamcpforit`, `isthereapluginforit`,
  `isthereapromptforit` add a proxied DNS record (`AAAA` → `100::`) and a dynamic redirect, e.g.
  `http.host eq "isthereanmcpforit.biratdatta.tech"` → `concat("https://isthere.biratdatta.tech/mcp", http.request.uri.path)` (301).
- Old `/notion`-style URLs 301 to `/prompts/notion`.

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
| Directory config (words, verdict labels, vote meaning, short-link hosts) | `src/lib/kinds.ts` |
| Shared home, directory pages, entry pages | `src/pages/index.astro`, `src/components/Directory.astro`, `src/pages/[kind]/[slug].astro` |
| Ranked lists, live search, chips | `src/components/EntryList.astro`, `SearchChips.astro`, `src/scripts/main.ts` (prerendered; `?q=`, `?cat=`, `?kind=` are applied on load, lists re-rank by live votes) |
| Tickers: Σ price × votes (or "I use this" for MCPs), odometer + tape | `src/components/Ticker.astro`, `Odometer.astro`, `Tape.astro` |
| Per-agent installs and prompt prefixes | `src/lib/installs.ts`, `src/lib/agents.ts`, `src/components/InstallBlock.astro` |
| Live numbers for static pages | `src/pages/api/counts.ts` → `snapshot()` in `src/lib/db.ts` |
| Legacy URL redirects | `src/pages/[slug].astro` |
| Votes: 1 per entry per IP per 24h, max 20/hour per IP | `src/lib/db.ts` → `castVote`, keyed `kind:slug` (IPs are salted + hashed, never stored raw) |
| Waitlist: honeypot, dedupe (case-insensitive), 5/hour per IP | `src/pages/api/waitlist.ts` |
| Favicons proxied server-side and cached in D1 | `src/pages/api/favicon/[slug].ts` |
| JSON-LD: WebSite+SearchAction, Organization, ItemList, BreadcrumbList, FAQPage | `src/lib/seo.ts` |
| sitemap.xml, robots.txt | `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts` |

Content, search engines and the forms work without JavaScript (forms POST + redirect). Live counts need JS.

## Privacy

No accounts, no payments, no cookies, no third-party scripts, fonts or icon services in the browser.
Analytics is a single first-party beacon (`/api/hit`) that stores `(day, path, referrer host, count)`; it is skipped
when Do Not Track or Global Privacy Control is on. Query it with:

```bash
npx wrangler d1 execute isthere --remote --command "SELECT path, SUM(n) FROM hits GROUP BY path ORDER BY 2 DESC LIMIT 20;"
```

## Motion

Odometer rolls, hover lifts, press scales, copy confirmations and reveal-on-scroll are CSS transitions driven by
small vanilla JS. Everything collapses to instant under `prefers-reduced-motion: reduce`, and the scrolling tape
becomes a static, horizontally scrollable strip.

## License

MIT. See [LICENSE](LICENSE). Verdicts are opinions; trademarks belong to their owners.
