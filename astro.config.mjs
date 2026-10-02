import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
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
