/**
 * @packageDocumentation
 *
 * Production Worker entry point.
 *
 * Astro's own Cloudflare handler answers the page. This file forwards `fetch`
 * to `serve` (the security headers, the rate limits, the edge copy of the page
 * and `Server-Timing`; see `lib/core/http/serve.ts`), so every response goes
 * through the same pipeline as the other apps. `wrangler.jsonc` points `main`
 * here.
 */

import { handle } from '@astrojs/cloudflare/handler';
import { serve } from './lib/core/http';

/** The Worker itself. */
const handler: ExportedHandler<Record<string, unknown>> = {
  async fetch(request, env, ctx) {
    return serve(request, env, ctx, { app: { fetch: handle } });
  },
};

export default handler;
