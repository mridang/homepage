// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// Single-page personal homepage, fully server-rendered on Cloudflare
// Workers. `output: 'server'` makes every route SSR through the Worker
// (no prerendered HTML), and the Cloudflare adapter emits the worker
// entry + hashed assets into dist/.
export default defineConfig({
  site: 'https://mrida.ng',
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    // Optimise images at build time instead of binding to the runtime
    // Cloudflare Images product — the homepage has no need for on-the-fly
    // transforms, and this keeps the Worker free of an IMAGES binding.
    imageService: 'compile',
  }),
  // The adapter wires a Cloudflare KV `SESSION` binding by default (which
  // would need a provisioned KV namespace to deploy). This site has no
  // sessions, so use the no-op driver to drop the binding entirely.
  session: {
    driver: sessionDrivers.null(),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
