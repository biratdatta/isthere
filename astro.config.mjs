// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Pages are prerendered (fast, free static assets on Cloudflare). Only the API routes,
// which talk to D1, run on demand in the Worker (`export const prerender = false`).
export default defineConfig({
  site: 'https://isthere.biratdatta.tech',
  output: 'static',
  adapter: cloudflare({ imageService: 'passthrough', prerenderEnvironment: 'node' }),
  trailingSlash: 'never',
  // No sessions needed (no accounts), so no KV namespace gets created.
  session: false,
  // /mcp/notion.html instead of /mcp/notion/index.html, so URLs have no trailing slash.
  build: { format: 'file' },
});
