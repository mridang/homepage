import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serve } from '../../../../src/lib/core/http/serve.ts';

const ctx = { waitUntil: () => undefined } as unknown as ExecutionContext;
const POLICY =
  "default-src 'self'; frame-ancestors 'none'; report-to csp-endpoint";
const app = {
  fetch: () =>
    new Response('<html></html>', {
      headers: {
        'content-type': 'text/html',
        'content-security-policy': POLICY,
      },
    }),
};

/** An in-memory stand-in for the edge cache. */
function memoryCache(): Cache {
  const store = new Map<string, Response>();
  return {
    match: (request: Request) =>
      Promise.resolve(store.get(request.url)?.clone()),
    put: (request: Request, response: Response) => {
      store.set(request.url, response);
      return Promise.resolve();
    },
  } as unknown as Cache;
}

void test('every answer has Server-Timing with the total, the edge outcome and the app time', async () => {
  const response = await serve(new Request('https://mrida.ng/'), {}, ctx, {
    app,
  });
  assert.match(
    response.headers.get('Server-Timing') ?? '',
    /^total;dur=[\d.]+, edge;desc="skip", app;dur=[\d.]+$/,
  );
});

void test('the app policy is the one sent, with its reporting endpoint', async () => {
  const response = await serve(new Request('https://mrida.ng/'), {}, ctx, {
    app,
  });
  assert.equal(response.headers.get('Content-Security-Policy'), POLICY);
  assert.equal(
    response.headers.get('Reporting-Endpoints'),
    'csp-endpoint="/csp/reports"',
  );
});

void test('the page is kept at the edge and the second visit is a hit', async () => {
  const cache = memoryCache();
  const first = await serve(new Request('https://mrida.ng/'), {}, ctx, {
    app,
    cache,
  });
  assert.match(first.headers.get('Server-Timing') ?? '', /edge;desc="miss"/);
  await Promise.resolve();
  const second = await serve(new Request('https://mrida.ng/'), {}, ctx, {
    app: { fetch: () => assert.fail('the app must not be asked') },
    cache,
  });
  assert.match(
    second.headers.get('Server-Timing') ?? '',
    /^total;dur=[\d.]+, edge;desc="hit"$/,
  );
});

void test('a caller over the limit is refused with 429 before the app runs', async () => {
  const env = { RL_SITE: { limit: () => Promise.resolve({ success: false }) } };
  const response = await serve(new Request('https://mrida.ng/'), env, ctx, {
    app: { fetch: () => assert.fail('the app must not be asked') },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
});

void test('a missing or failing binding lets the request through', async () => {
  const failing = {
    RL_SITE: { limit: () => Promise.reject(new Error('down')) },
  };
  for (const env of [{}, failing]) {
    const response = await serve(new Request('https://mrida.ng/'), env, ctx, {
      app,
    });
    assert.equal(response.status, 200);
  }
});
