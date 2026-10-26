import { describe, expect, it } from '@jest/globals';

import { withPageCache } from '@/page-cache';

const page = () =>
  new Response('<html></html>', {
    headers: { 'Cache-Control': 'private, no-cache' },
  });

describe('withPageCache', () => {
  it('makes the home page public for five minutes', () => {
    const response = withPageCache(new Request('https://mrida.ng/'), page());
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('gives a HEAD request the same rule as a GET', () => {
    const response = withPageCache(
      new Request('https://mrida.ng/', { method: 'HEAD' }),
      page(),
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('leaves other paths, methods and statuses with their own rule', () => {
    const other = withPageCache(
      new Request('https://mrida.ng/csp/reports'),
      page(),
    );
    const post = withPageCache(
      new Request('https://mrida.ng/', { method: 'POST' }),
      page(),
    );
    const missing = withPageCache(
      new Request('https://mrida.ng/'),
      new Response(null, {
        status: 404,
        headers: { 'Cache-Control': 'private, no-cache' },
      }),
    );
    for (const response of [other, post, missing]) {
      expect(response.headers.get('Cache-Control')).toBe('private, no-cache');
    }
  });
});
