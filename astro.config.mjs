// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: anpassen, sobald der Domain-Umzug (unsignedhannover.com) ansteht.
  site: 'https://unsigned-hannover.github.io',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap()]
});