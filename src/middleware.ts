import { defineMiddleware } from 'astro:middleware';
import { SECURITY_HEADERS } from './headers';

// Security headers for any response the Worker still produces (404s and
// other non-prerendered routes). The page itself is prerendered and served
// from Workers assets, which take their headers from public/_headers.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
});
