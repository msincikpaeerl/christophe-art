import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// Server-rendered site: public pages are rendered on the server so search engines can index them.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  telemetry: false,
});
