import { defineMiddleware } from 'astro:middleware';

// Security headers for the server-rendered responses. The public/_headers
// file only applies to static asset responses served by the ASSETS
// binding — it does NOT cover the Worker-generated HTML — so the page
// itself needs these set here.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const headers = response.headers;
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
});
