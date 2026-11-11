/**
 * @file The edge cache for anonymous pages: which requests may use it, its keys, and how a copy is stored and served.
 * @packageDocumentation
 *
 * The pages anyone can see (the kept pages in `site.ts`) are the same for
 * every signed-out visitor, so the Worker keeps a copy of each at the edge and
 * answers from it in a few milliseconds, without waking the app. Anyone with a
 * session cookie bypasses this entirely and always gets the live, personal
 * page. A deploy changes the cache key (the version id is part of it), so a new
 * release never serves HTML that points at old, replaced scripts. A copy is not
 * a way round the rate limits: `serve.ts` counts the request first.
 */

import { SITE_NAME } from '@/utils/site';
import { nonceOf } from './csp';
import { EDGE_LIMITS } from './extras';
import { replacingHeaders } from './headers';
import {
  CACHED_QUERY_PARAMS,
  EDGE_CACHED_PAGES,
  EDGE_TTL_SECONDS,
} from './site';

/** The most query parameters a kept page may carry. */
const MAX_PARAMS = 8;
/** The longest value a parameter of a kept page may have. */
const MAX_VALUE_LENGTH = 64;
/** Addresses a developer reaches the Worker on; what they see is never kept. */
const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
]);

/**
 * Whether the request was made on a developer's own machine: to a local
 * address, or from a loopback address. `wrangler dev` rewrites both the
 * request's URL and its `Host` header to the address in the app's route, but it
 * still reports the caller as `::1` or `127.0.0.1` in `cf-connecting-ip`, which
 * Cloudflare sets itself and a visitor cannot choose.
 * @param request - The incoming request.
 * @param url - The request's parsed URL.
 * @returns True when the request comes from a developer's own machine.
 * @example
 * ```ts
 * isLocal(new Request('http://localhost:8787/'), new URL('http://localhost:8787/')); // true
 * ```
 */
function isLocal(request: Request, url: URL): boolean {
  const host = (request.headers.get('host') ?? '')
    .toLowerCase()
    .replace(/:\d+$/, '');
  const caller = request.headers.get('cf-connecting-ip') ?? '';
  return (
    LOCAL_HOSTS.has(url.hostname) ||
    LOCAL_HOSTS.has(host) ||
    caller === '::1' ||
    /^(::ffff:)?127\./.test(caller)
  );
}

/** The kinds of response worth keeping. */
const STORABLE_TYPES: readonly string[] = ['text/html', 'application/rss+xml'];

/**
 * The query of a request reduced to what a kept page may carry, sorted by
 * name, or null if it carries anything else: a name that is not in `allowed`, a
 * name given twice, a value over {@link MAX_VALUE_LENGTH} characters, or more
 * than {@link MAX_PARAMS} parameters. Refusing those keeps a caller from
 * making an unlimited number of copies.
 * @param url - The request URL whose query is checked.
 * @param allowed - The query parameter names a kept page may carry.
 * @returns The sorted query, or null when it carries anything a kept page may not.
 * @example
 * ```ts
 * allowedQuery(new URL('https://example.com/?b=2&a=1'), new Set(['a', 'b']))?.toString(); // 'a=1&b=2'
 * ```
 */
function allowedQuery(
  url: URL,
  allowed: ReadonlySet<string>,
): URLSearchParams | null {
  const entries = [...url.searchParams];
  if (entries.length > MAX_PARAMS) {
    return null;
  }
  const names = new Set<string>();
  for (const [name, value] of entries) {
    if (
      !allowed.has(name) ||
      names.has(name) ||
      value.length > MAX_VALUE_LENGTH
    ) {
      return null;
    }
    names.add(name);
  }
  return new URLSearchParams(
    entries.toSorted(([a], [b]) => (a < b ? -1 : Number(a > b))),
  );
}

/**
 * Whether this request may be answered from (and added to) the edge copy:
 * a plain GET of one of `pages` (the kept pages unless told otherwise), with no
 * query or only the parameters in `allowed`, from someone with no session, and
 * not on a developer's own machine.
 * @param request - The incoming request.
 * @param pages - The paths that may be kept. Defaults to the edge-cached pages.
 * @param sessionCookie - The name of the session cookie. Its presence, valid or not, bypasses the cache.
 * @param allowed - The query parameter names a kept page may carry.
 * @returns True when the request may use the edge copy.
 * @example
 * ```ts
 * isEdgeCacheable(new Request('https://example.com/')); // true
 * ```
 */
export function isEdgeCacheable(
  request: Request,
  pages: ReadonlySet<string> = EDGE_CACHED_PAGES,
  sessionCookie: string | undefined = EDGE_LIMITS.sessionCookie,
  allowed: ReadonlySet<string> = CACHED_QUERY_PARAMS,
): boolean {
  if (request.method !== 'GET') {
    return false;
  }
  const url = new URL(request.url);
  if (!pages.has(url.pathname) || isLocal(request, url)) {
    return false;
  }
  if (allowedQuery(url, allowed) === null) {
    return false;
  }
  if (request.headers.has('authorization')) {
    return false;
  }
  // Any session cookie, valid or not, means "treat as someone's own page".
  const cookie = request.headers.get('cookie') ?? '';
  return sessionCookie === undefined || !cookie.includes(`${sessionCookie}=`);
}

/**
 * The cache key for a page at one release: the path and the allowed
 * parameters, sorted by name, so the order a caller wrote them in makes no
 * difference. Only for a request {@link isEdgeCacheable} accepted.
 * @param request - A request that {@link isEdgeCacheable} accepted.
 * @param version - The deployed version id, so a new release never serves old pages.
 * @param allowed - The query parameter names a kept page may carry.
 * @returns A request whose URL serves as the cache key.
 * @example
 * ```ts
 * const key = edgeCacheKey(new Request('https://example.com/'), 'v1');
 * ```
 */
export function edgeCacheKey(
  request: Request,
  version: string,
  allowed: ReadonlySet<string> = CACHED_QUERY_PARAMS,
): Request {
  const url = new URL(request.url);
  const query = allowedQuery(url, allowed)?.toString() ?? '';
  const search = query ? `?${query}` : '';
  return new Request(
    `https://edge.${SITE_NAME}.invalid/${encodeURIComponent(version)}${url.pathname}${search}`,
  );
}

/**
 * A copy of the response fit to keep, or null if it isn't (an error, a
 * redirect, something that isn't a page or a feed, or anything that sets a cookie). The
 * copy is marked public so the edge cache accepts it.
 * @param response - The response the app produced.
 * @returns A public copy of the response, or null when it must not be kept.
 * @example
 * ```ts
 * const copy = storableCopy(new Response('<html></html>', { headers: { 'content-type': 'text/html' } }));
 * ```
 */
export function storableCopy(response: Response): Response | null {
  if (
    response.status !== 200 ||
    response.headers.has('set-cookie') ||
    !STORABLE_TYPES.some((type) =>
      (response.headers.get('content-type') ?? '').startsWith(type),
    )
  ) {
    return null;
  }
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers: replacingHeaders(response.headers, {
      'Cache-Control': `public, max-age=${EDGE_TTL_SECONDS}`,
    }),
  });
}

/**
 * A cached page with this request's own Content Security Policy nonce in place
 * of the one it was stored with. The copy is shared by every anonymous visitor
 * for several minutes, and a nonce that stays the same for that long is a
 * password everyone knows; so each hit gets a nonce of its own, swapped into the
 * scripts and into the policy header. A page whose policy carries no nonce is
 * returned as it is.
 * @param cached - The stored copy of the page.
 * @param nonce - The nonce of this request.
 * @param csp - The policy of this request.
 * @returns The page with this request's nonce, or the cached page when it has no nonce.
 * @example
 * ```ts
 * const nonce = newNonce();
 * const page = await withFreshNonce(cached, nonce, buildCsp(nonce));
 * ```
 */
export async function withFreshNonce(
  cached: Response,
  nonce: string,
  csp: string,
): Promise<Response> {
  const old = nonceOf(cached.headers.get('content-security-policy') ?? '');
  if (old === undefined) {
    return cached;
  }
  const body = await cached.text();
  return new Response(body.replaceAll(old, nonce), {
    status: cached.status,
    statusText: cached.statusText,
    headers: replacingHeaders(cached.headers, {
      'Content-Security-Policy': csp,
    }),
  });
}

/**
 * Whether a value can be used as the edge cache: it answers `match` and `put`.
 * @param value - The value to test.
 * @returns True when the value has both `match` and `put` methods.
 * @example
 * ```ts
 * isCache({ match() {}, put() {} }); // true
 * ```
 */
function isCache(value: unknown): value is Cache {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'match') === 'function' &&
    typeof Reflect.get(value, 'put') === 'function'
  );
}

/**
 * Cloudflare's per-colo cache; absent when running under plain Node.
 * @returns The default cache, or undefined when the Workers cache is not available.
 * @example
 * ```ts
 * const cache = edgeCache(); // undefined under plain Node
 * ```
 */
export function edgeCache(): Cache | undefined {
  const store: unknown = Reflect.get(globalThis, 'caches');
  const cache: unknown =
    typeof store === 'object' && store !== null
      ? Reflect.get(store, 'default')
      : undefined;
  return isCache(cache) ? cache : undefined;
}
