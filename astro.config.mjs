// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// Single-page personal homepage on Cloudflare Workers. `output: 'server'`
// keeps non-prerendered routes (404s) on the Worker; the one page opts in to
// prerendering and is served from assets. The Cloudflare adapter emits the worker
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
  // src/middleware.ts and public/_headers since <meta>-delivered CSP ignores it.
  // The CSP stays a <meta> tag: Astro only exposes the hashes for a
  // prerendered page through that tag, so there is no supported way to move
  // them into a real header; _headers adds a frame-ancestors header instead.
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
