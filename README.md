<div align="center">

# is<span>there</span>?

### Is there a **skill**, an **MCP**, a **plugin**, a **prompt** or an **agent** for it?

The SaaS you pay for every month, checked against what an AI agent can do instead.<br />
Honest verdicts. Copy-paste installs. What you actually give up.

**[isthere.biratdatta.tech](https://isthere.biratdatta.tech)**

[![MIT License](https://img.shields.io/badge/license-MIT-1d4fe0?style=flat-square)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro-0e1322?style=flat-square&logo=astro)](https://astro.build)
[![Runs on Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-f38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-137a3f?style=flat-square)](#-add-an-app-in-2-minutes)

</div>

---

## Pick a question

| | Directory | The question | Verdicts | Try it |
|:-:|---|---|---|---|
| 🧠 | **[Skills](https://isthere.biratdatta.tech/skills)** | Can an Agent Skill (a `SKILL.md`) do the job? | `YES` · `KINDA` · `NOT REALLY` | [isthereaskillforit…/grammarly](https://isthereaskillforit.biratdatta.tech/grammarly) |
| 🔌 | **[MCPs](https://isthere.biratdatta.tech/mcp)** | Is there an MCP server so your agent can drive it? | `OFFICIAL` · `COMMUNITY` · `NOT YET` | [isthereanmcpforit…/github](https://isthereanmcpforit.biratdatta.tech/github) |
| 🧩 | **[Plugins](https://isthere.biratdatta.tech/plugins)** | Can an agent plugin replace the workflow? | `YES` · `KINDA` · `NOT REALLY` | [isthereapluginforit…/coderabbit](https://isthereapluginforit.biratdatta.tech/coderabbit) |
| ⌨️ | **[Prompts](https://isthere.biratdatta.tech/prompts)** | Can one coding prompt rebuild it? | `YES` · `KINDA` · `NOT REALLY` | [isthereapromptforit…/calendly](https://isthereapromptforit.biratdatta.tech/calendly) |
| 🤖 | **[Agents](https://isthere.biratdatta.tech/agents)** | Is there an AI agent that does the job? | `YES` · `KINDA` · `NOT REALLY` | [isthereanagentforit…/calendly](https://isthereanagentforit.biratdatta.tech/calendly) |

Every entry comes with install commands for **Claude Code**, **Codex** and **Cursor**, the list of things you lose by switching,
open-source prior art, and an **"I replaced this"** button that feeds the site's
**COLLECTIVE MRR DESTROYED** ticker.

> **Short links:** `is-there-a-<thing>-for-it.biratdatta.tech/<app>` takes you straight to the answer.
> `isthereanmcpforit.biratdatta.tech/notion` → the Notion MCP page.

---

## What's inside

<table>
<tr>
<td width="50%" valign="top">

**For visitors**
- One search across all five directories
- Death List ranked by real votes, live MRR ticker
- Per-agent install tabs with one-click copy
- Light mode and a calm slate dark mode
- Submit your own find, or book an ad slot

</td>
<td width="50%" valign="top">

**Under the hood**
- [Astro 7](https://astro.build), every page prerendered
- Cloudflare Workers + D1 for votes and forms
- Vanilla JS, no client framework
- Social cards generated at build time
- Content is plain JSON in `data/`

</td>
</tr>
</table>

---

## Run it locally

```bash
git clone https://github.com/biratdatta/isthere.git
cd isthere
npm install
npm run seed:demo   # optional: sample votes so lists aren't empty
npm run dev         # → http://localhost:4321
```

<details>
<summary><b>Deploy your own copy</b></summary>

1. Create a Cloudflare account and add your domain.
2. **Workers & Pages → Create → Import a repository**, pick your fork.
   Build command `npm run build`, deploy command `npx wrangler deploy`.
3. Change the domain in `wrangler.jsonc`, `astro.config.mjs` (`site`) and `src/lib/seo.ts` (`SITE_HOST`).
4. Short links (optional): `npx wrangler login`, then `npm run deploy:shortlinks`.

Every push to `main` redeploys. The database tables create themselves on first use.

</details>

---

## ✍️ Add an app in 2 minutes

Found a tool we're missing? Two ways in:

- **No code:** use the form at **[isthere.biratdatta.tech/submit](https://isthere.biratdatta.tech/submit)**.
- **Pull request:** add one JSON file to `data/<directory>/<app>.json`. Same slug across directories means the pages link to each other.

<details>
<summary><b>The fields every entry has</b></summary>

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
  "whatYouLose": ["Be honest here. It's the point of the site."],
  "priorArt": [{ "name": "AppFlowy", "url": "https://github.com/AppFlowy-IO/AppFlowy" }],
  "notes": "One or two plain sentences."
}
```

`category` must exist in `src/lib/apps.ts`. Use `"priceMonthly": null` for usage-based pricing and explain it in `priceNote`.

</details>

<details>
<summary><b>🧠 Skills: add a <code>skill</code> block</b></summary>

An existing skill from a marketplace:

```json
"skill": {
  "name": "pdf",
  "sourceUrl": "https://github.com/anthropics/skills/tree/main/skills/pdf",
  "marketplace": "anthropics/skills",
  "plugin": "document-skills@anthropic-agent-skills"
}
```

Or a skill you wrote, inline:

```json
"skill": { "name": "copyedit", "sourceUrl": null, "skillMd": "---\nname: copyedit\ndescription: …\n---\n# Copyedit…" }
```

</details>

<details>
<summary><b>🔌 MCPs: add <code>server</code> and <code>tools</code></b></summary>

```json
"server": {
  "official": true,
  "transport": "http",
  "url": "https://mcp.notion.com/mcp",
  "auth": "oauth",
  "docsUrl": "https://developers.notion.com/guides/mcp/overview"
},
"tools": ["notion-search", "notion-fetch", "notion-create-pages"]
```

Local servers use `"transport": "stdio"` with `"command"`, `"args"` and optional `"env": ["API_KEY"]`.

</details>

<details>
<summary><b>🧩 Plugins: add a <code>plugin</code> block</b></summary>

```json
"plugin": {
  "name": "code-review",
  "marketplace": "anthropics/claude-plugins-official",
  "marketplaceName": "claude-plugins-official",
  "repoUrl": "https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-review",
  "includes": ["/code-review command", "4 parallel review agents"]
}
```

</details>

<details>
<summary><b>🤖 Agents: add an <code>agent</code> block</b></summary>

```json
"agent": {
  "name": "Howie",
  "maker": "3030 Labs",
  "url": "https://howie.com/",
  "price": "Team from $25/mo",
  "pricingUrl": "https://howie.com/#pricing",
  "autonomy": "autonomous",
  "does": ["Schedules meetings over email", "Follows up when people go quiet"]
}
```

`autonomy` is `autonomous` (works on its own) or `supervised` (you review its work).

</details>

<details>
<summary><b>⌨️ Prompts: add the <code>prompt</code></b></summary>

```json
"prompt": "Build a self-hosted scheduling page, a Calendly replacement for one person.\n\nStack: …\nFeatures:\n- …\nDone when: …"
```

Write it so an agent can finish in one session: stack, features, and a clear "done when".

</details>

Then check your file:

```bash
npm run check-data   # validates every entry (also runs in CI)
```

The install snippets for each agent are generated from your fields, so you never write them by hand.

---

## Where things live

```text
data/
  skills/ mcp/ plugins/ prompts/ agents/   one JSON file per app
src/
  pages/            home, /[directory], /[directory]/[app], /submit, /advertise
  components/       nav, tiles, Death List, install tabs, ticker
  lib/kinds.ts      the five directories: words, verdict labels, colours
  lib/installs.ts   per-agent install commands
  styles/global.css the whole design system
shortlinks/         redirect Worker for the isthere…forit subdomains
scripts/og.mjs      social card generator
```

<details>
<summary><b>Reading form submissions</b></summary>

Submissions and ad requests are stored in the `submissions` and `ad_requests` tables.
Open them in the Cloudflare dashboard under **Storage & databases → D1 → isthere**, or:

```bash
npx wrangler d1 execute isthere --remote --command "SELECT * FROM submissions WHERE status = 'new' ORDER BY created_at DESC"
```

</details>

---

## FAQ

<details>
<summary><b>Are the verdicts objective?</b></summary>

No. They're honest opinions with the trade-offs spelled out. Disagree? Open a PR with your reasoning.

</details>

<details>
<summary><b>Are prices up to date?</b></summary>

They're entry paid tiers at the time they were added and drift over time. Each entry links to the vendor's pricing page.

</details>

<details>
<summary><b>Do ads affect verdicts?</b></summary>

Never. Ads are one static image and a link in the page margins, clearly labelled.

</details>

---

<div align="center">

**MIT licensed** · verdicts are opinions · trademarks belong to their owners

If this saved you a subscription, [hit "I replaced this"](https://isthere.biratdatta.tech) and ⭐ the repo.

</div>
