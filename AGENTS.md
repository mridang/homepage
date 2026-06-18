# This is NOT the Astro you know

This version may have breaking changes — APIs, conventions, and file
structure may all differ from your training data. Check the installed
version (`node_modules/astro/package.json`) and read the relevant docs
before writing any code. Heed deprecation notices.

The site is a single, fully server-rendered page (`output: 'server'`)
running as a Cloudflare Worker via `@astrojs/cloudflare`. There is no
database, no API routes, and no client-side framework — keep it that way
unless the task explicitly calls for more.
