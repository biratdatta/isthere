// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: process.env.SITE_URL || 'https://isthere.biratdatta.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'never',
  vite: {
    ssr: { external: ['better-sqlite3'] },
  },
});
