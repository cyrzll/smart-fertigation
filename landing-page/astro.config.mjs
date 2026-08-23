// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  },

  output: 'server',

  adapter: node({
    mode: 'standalone'
  }),

  server: {
    host: '0.0.0.0',
    port: 4321
  }
});