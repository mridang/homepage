/** The page is public and the same for everyone, so a browser may keep it too. */
const PAGE_CACHE_CONTROL = 'public, max-age=300';

/**
 * The response with this site's cache rule for the home page. The shared
 * pipeline marks every page `private, no-cache` (pages are personal in the
 * other apps); this one is not.
 */
export function withPageCache(request: Request, response: Response): Response {
  if (
    (request.method !== 'GET' && request.method !== 'HEAD') ||
    new URL(request.url).pathname !== '/' ||
    response.status !== 200
  ) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', PAGE_CACHE_CONTROL);
  return new Response(response.body, { status: 200, headers });
}
