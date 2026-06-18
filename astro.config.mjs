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
  // Inline the (small) stylesheet into the HTML so it isn't a separate
  // render-blocking request — single-page site, so there's nothing to
  // share a cached stylesheet with anyway.
  build: { inlineStylesheets: 'always' },
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
  // Content-Security-Policy. Astro hashes its own inlined <style> and
  // processed <script> and injects them into style-src/script-src; we add
  // 'self' (for the hashed-then-externalised assets) and lock everything
  // else down. frame-ancestors is also enforced via X-Frame-Options in
  // src/middleware.ts since <meta>-delivered CSP ignores it.
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
      ],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: { resources: ["'self'"] },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
