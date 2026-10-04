Build me a directory site called "Is there a skill for it?" that answers, per paid
SaaS app, whether you can replace it with one AI coding prompt. Requirements:

- Stack: Astro (server output, node adapter) + better-sqlite3. No client
  framework: vanilla JS for interactions. Dev-tool aesthetic: JetBrains Mono +
  Space Grotesk, CRT-black dark mode (default) and a paper light mode, phosphor
  green as the only loud color.
- Each app is one JSON file in data/apps/: slug, name, domain, category,
  priceMonthly, verdict (yes|kinda|no), whatYouLose[], priorArt[], prompt, notes.
- Homepage: hero search that live-filters, category chips with emoji, and "The
  Death List": apps ranked by "I replaced this" votes, each row: favicon, name,
  category, price, verdict badge (YES green / KINDA amber / NOT REALLY red),
  vote count.
- A loud "COLLECTIVE MRR DESTROYED: $X/mo" ticker (sum of price × votes) with
  odometer-rolling digits and a scrolling tape of app prices. It must look like
  a stock ticker, not text.
- App pages at /:slug: big verdict, the one-shot build prompt in a code block
  with per-agent copy buttons (Claude Code / Codex / Cursor, each prefixes
  agent-specific run instructions), honest "what you lose" list, prior-art
  links, 3 related apps, an "I replaced this" vote button (SQLite counter,
  IP rate-limited, no auth), a share-on-X button, and a 4-question FAQ.
- SEO: server-rendered everything, question-format titles, canonical URLs,
  JSON-LD (WebSite+SearchAction, ItemList, FAQPage, BreadcrumbList,
  Organization), sitemap.xml, robots.txt, per-page OG images generated at
  build time with satori + resvg.
- Waitlist email capture (SQLite, honeypot, dedupe) and a footer that links to
  this very rebuild prompt, because the site should practice what it preaches.
- Micro-animations everywhere, tastefully: odometer rolls, hover lifts, press
  scales, copy confirmations, reveal-on-scroll. Respect prefers-reduced-motion.

MIT license. Public repo. No accounts, no payments, no tracking beyond
first-party analytics.
