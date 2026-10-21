import { defineConfig } from 'astro/config';

// BASE_PATH задаётся при сборке для GitHub Pages (/gbi2-redesign/), локально — корень.
export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
