/**
 * @packageDocumentation
 *
 * What differs from one app to the next in the shared HTTP code (`headers.ts`,
 * `csp.ts`, `edge-limits.ts`, `edge-cache.ts`): the pages search engines may
 * index, the pages the edge may keep a copy of (with the query names they may
 * carry and for how long), the files other sites may load, the small files
 * that may be cached for a day, the files the edge limits do not count or count
 * as discovery, and the few outside places and extra rules a page's policy
 * needs. Everything else in those files is the same in every app.
 */

/** The pages search engines may index. Everything else is private. */
export const PUBLIC_PAGES: ReadonlySet<string> = new Set(['/']);

/**
 * The pages the Worker may keep a copy of at the edge and answer without waking
 * the app. The same as the public pages: they are the same for every visitor.
 */
export const EDGE_CACHED_PAGES: ReadonlySet<string> = new Set(PUBLIC_PAGES);

/**
 * The query parameter names a kept page may carry. A request with any other
 * name is never kept, and the copy is keyed by these parameters alone.
 * None: the kept pages are only ever asked for without a query string.
 */
export const CACHED_QUERY_PARAMS: ReadonlySet<string> = new Set();

/** How long the edge may keep a page before asking the app again, in seconds. */
export const EDGE_TTL_SECONDS = 300;

/**
 * The files other sites embed or fetch on purpose (the social card, the
 * icons and the plain-text files at the root). They are open to all and not
 * marked noindex.
 */
export const OPEN_FILES =
  /^\/(og\.png|favicon\.svg|favicon\.ico|favicon-\d+x\d+\.png|apple-touch-icon\.png|mask-icon\.svg|robots\.txt|sitemap\.xml|\.well-known\/.*)$/;

/** The small files that rarely change, and for which a stale copy is harmless. */
export const RARELY_CHANGING: ReadonlySet<string> = new Set([
  '/favicon.svg',
  '/favicon.ico',
  '/mask-icon.svg',
  '/apple-touch-icon.png',
  '/og.png',
]);

/**
 * The outside places pages may load pictures from, besides this site (`'self'`)
 * and inline `data:` pictures. None.
 */
export const EXTRA_IMG_SOURCES: readonly string[] = [];

/**
 * Directives only this app adds to its policy. None.
 */
export const EXTRA_DIRECTIVES: readonly string[] = [];

/** Paths served as static files: nothing to protect, and a page loads dozens of them. */
export const STATIC_PREFIXES: readonly string[] = ['/_astro/', '/fonts/'];

/** The files at the root that are read by crawlers and installers and cost nothing to serve. */
export const DISCOVERY_PATHS: ReadonlySet<string> = new Set([
  '/robots.txt',
  '/sitemap.xml',
]);

/**
 * A cache rule for pages that differ from the default `private, no-cache`,
 * keyed by path. The home page is public and the same for everyone.
 */
export const PAGE_CACHE_RULES: Readonly<Record<string, string>> = {
  '/': 'public, max-age=300',
};
