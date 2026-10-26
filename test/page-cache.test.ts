import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withPageCache } from '../src/page-cache.ts';

const page = () =>
  new Response('<html></html>', {
    headers: { 'Cache-Control': 'private, no-cache' },
  });

void test('the home page is public for five minutes', () => {
  const response = withPageCache(new Request('https://mrida.ng/'), page());
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
});

void test('a HEAD request gets the same rule as a GET', () => {
  const response = withPageCache(
    new Request('https://mrida.ng/', { method: 'HEAD' }),
    page(),
  );
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
});

void test('other paths, methods and statuses keep their own cache rule', () => {
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
    assert.equal(response.headers.get('Cache-Control'), 'private, no-cache');
  }
});
