# This is NOT the Astro you know

This version may have breaking changes — APIs, conventions, and file
structure may all differ from your training data. Check the installed
version (`node_modules/astro/package.json`) and read the relevant docs
before writing any code. Heed deprecation notices.

The site is a single, fully server-rendered page (`output: 'server'`)
running as a Cloudflare Worker via `@astrojs/cloudflare`. There is no
database, no API routes, and no client-side framework — keep it that way
unless the task explicitly calls for more.

## Tailwind

Tailwind 4 no longer gives `<button>` the pointer cursor, so the base layer of the app's stylesheet carries one rule that does (buttons, `summary`, `select`, `[role='button']` and button-like inputs, never disabled ones). Keep it, and keep it identical across the apps. Do not add `cursor-pointer` to individual buttons to work around its absence, and do not restyle a link or a button to fake the other: use `<a>` or `<Link>` when the click goes to a URL, and `<button>` when it acts on the current page.
