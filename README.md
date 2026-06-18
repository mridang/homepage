# homepage

My personal homepage — a single, fully server-rendered page running on
Cloudflare Workers.

Live: `https://mrida.ng`

## Stack

- **[Astro](https://astro.build)** with `output: 'server'` — every request
  is server-rendered through the Worker; no prerendered HTML, no
  client-side framework.
- **[@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)**
  — emits the SSR Worker (`dist/_worker.js`) and the hashed static assets
  that the `ASSETS` binding serves.
- **[Tailwind CSS v4](https://tailwindcss.com)** via the Vite plugin.
- **[wrangler](https://developers.cloudflare.com/workers/wrangler/)** for
  local dev and deploys.

## Layout

```
src/
  layouts/Layout.astro   # <html> shell: SEO, OpenGraph, fonts
  pages/index.astro      # the single page
  styles/global.css      # Tailwind entry + theme tokens
public/                  # static assets (favicon, _headers)
```

## Development

The repo pins Node 24 via [devbox](https://www.jetify.com/devbox)
(`devbox.json`) and `.nvmrc`.

```sh
npm install
npm run dev            # astro dev server
npm run build          # build the Worker bundle into dist/
npx wrangler dev       # run the built Worker locally on the edge runtime
```

Handy devbox scripts:

```sh
devbox run dev          # astro dev on :3737
devbox run wrangler-dev # build + wrangler dev on :3737 (edge runtime)
devbox run check        # build + eslint
devbox run deploy       # build + wrangler deploy
```

## Deployment

Pushing to `master` runs `.github/workflows/deploy.yml`, which builds with
Astro and deploys the Worker to Cloudflare. The Worker is bound to the
`mrida.ng` custom domain (the zone must be attached to the Cloudflare
account). The `workers.dev` subdomain is disabled so the apex is the only
canonical URL.

Deploys need a `CLOUDFLARE_API_TOKEN` secret and a `CLOUDFLARE_ACCOUNT_ID`
variable on the repo's `production` environment.
