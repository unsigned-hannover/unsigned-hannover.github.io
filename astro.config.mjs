// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Repo heißt unsigned-hannover.github.io -> Seite läuft im Wurzelverzeichnis, kein `base` nötig.
  // Beim späteren Domain-Umzug hier auf https://unsignedhannover.com umstellen.
  site: 'https://unsigned-hannover.github.io',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap()]
});