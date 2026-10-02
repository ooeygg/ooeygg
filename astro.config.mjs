import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
// Served at the domain root by server.mjs; GitHub Pages builds set SITE and
// BASE_PATH (the repo subpath, e.g. /ooeygg) — see .github/workflows/pages.yml.
export default defineConfig({
  site: process.env.SITE,
  base: process.env.BASE_PATH ?? '/',
  integrations: [
    react(),
    {
      name: 'afterload-directive',
      hooks: {
        'astro:config:setup': ({ addClientDirective }) =>
          addClientDirective({ name: 'afterload', entrypoint: './src/directives/afterload.js' }),
      },
    },
  ],
  // Inline the small global stylesheet so it doesn't block first paint.
  build: { inlineStylesheets: 'always' },
});
