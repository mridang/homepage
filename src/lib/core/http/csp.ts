/**
 * @file The Content Security Policy for every response, and the nonce that makes it work.
 * @packageDocumentation
 *
 * The Content Security Policy: the browser's own list of what a page may load
 * and run. It is what stops a script injected into a page (through some future
 * bug) from running at all.
 *
 * Scripts are allowed only if they carry this response's one-time number (the
 * nonce), which Next.js puts on the scripts and styles it writes when it finds
 * the nonce in the policy on the incoming request. `strict-dynamic` then lets
 * those scripts load the others they need. Nothing else may run, and nothing
 * may be framed, embedded or sent anywhere but this site.
 */

import { bytesToBase64 } from '@/utils/base64';
import { replacingHeaders } from './headers';
import { CSP_REPORT_DIRECTIVES } from './reporting';
import { EXTRA_DIRECTIVES, EXTRA_IMG_SOURCES } from './site';

/**
 * Creates a fresh, unguessable nonce for one response.
 * @returns Sixteen random bytes encoded as base64.
 * @example
 * ```ts
 * const nonce = newNonce(); // a 24-character base64 string
 * ```
 */
export function newNonce(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/** Which kind of page a policy is for: an ordinary one, or the approval screen. */
export type CspSurface = 'site' | 'approval';

/**
 * The policy for one response, carrying that response's nonce.
 *
 * No page may be framed by anyone, this site included (`frame-ancestors 'none'`).
 * The approval screen (`approval`) names no `form-action`, because its form redirects to the client's
 * own address and browsers check those redirects against `form-action`. The consent endpoint is protected
 * by its own same-origin and CSRF checks instead.
 * @param nonce - The one-time nonce that scripts and styles must carry.
 * @param surface - Which kind of page the policy is for. Defaults to `'site'`.
 * @returns The value of the Content-Security-Policy header.
 * @example
 * ```ts
 * const policy = buildCsp(newNonce(), 'approval');
 * ```
 */
export function buildCsp(nonce: string, surface: CspSurface = 'site'): string {
  const approval = surface === 'approval';
  return [
    // Deny anything not named below; every kind of load the site needs is listed.
    "default-src 'none'",
    // `'self'` only matters to browsers too old to know strict-dynamic.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Pictures come from this site; the few other places the app shows a
    // picture from are named in `site.ts`.
    ['img-src', "'self'", 'data:', ...EXTRA_IMG_SOURCES].join(' '),
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    ...(approval ? [] : ["form-action 'self'"]),
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
    // Directives only this app adds, if any (see `site.ts`).
    ...EXTRA_DIRECTIVES,
    ...CSP_REPORT_DIRECTIVES,
  ].join('; ');
}

/**
 * Which policy a path gets. The approval screen may not be framed by anyone,
 * not even this site, and must let the browser follow the redirect back to the
 * assistant, so it has a policy of its own; every other page has the site's.
 * @param pathname - The request path, without its query or fragment.
 * @returns `'approval'` for the sign-in approval screen, otherwise `'site'`.
 * @example
 * ```ts
 * cspSurfaceFor('/oauth/authorize'); // 'approval'
 * ```
 */
export function cspSurfaceFor(pathname: string): CspSurface {
  return pathname === '/oauth/authorize' ? 'approval' : 'site';
}

/**
 * Reads the nonce out of a Content-Security-Policy value.
 * @param csp - The policy text to read.
 * @returns The nonce, or undefined when the policy carries none.
 * @example
 * ```ts
 * nonceOf("script-src 'self' 'nonce-abc123'"); // 'abc123'
 * ```
 */
export function nonceOf(csp: string): string | undefined {
  return /'nonce-([^']+)'/.exec(csp)?.[1];
}

/**
 * The headers to forward to the app: the caller's own, with the policy and the
 * nonce set to ours. `set`, not append: a policy or nonce header sent by the
 * caller must be replaced, or Next.js could read the caller's nonce instead of
 * ours and render a page (that may then be cached) whose scripts our policy
 * refuses.
 * @param incoming - The headers of the caller's request.
 * @param csp - The policy to set on the forwarded request.
 * @param nonce - The nonce to set on the forwarded request.
 * @returns A copy of the incoming headers with the policy and nonce replaced.
 * @example
 * ```ts
 * const nonce = newNonce();
 * const headers = forwardedHeaders(request.headers, buildCsp(nonce), nonce);
 * ```
 */
export function forwardedHeaders(
  incoming: Headers,
  csp: string,
  nonce: string,
): Headers {
  return replacingHeaders(incoming, {
    'content-security-policy': csp,
    'x-nonce': nonce,
  });
}
