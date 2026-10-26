import { describe, expect, it, jest } from '@jest/globals';

import { serve } from '@/lib/core/http/serve';

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
const forbidden = {
  fetch: (): Response => {
    throw new Error('the app must not be asked');
  },
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

describe('serve', () => {
  it('adds Server-Timing with the total, the edge outcome and the app time', async () => {
    const response = await serve(new Request('https://mrida.ng/'), {}, ctx, {
      app,
    });
    expect(response.headers.get('Server-Timing')).toMatch(
      /^total;dur=[\d.]+, edge;desc="skip", app;dur=[\d.]+$/,
    );
  });

  it("sends the app's policy, with its reporting endpoint", async () => {
    const response = await serve(new Request('https://mrida.ng/'), {}, ctx, {
      app,
    });
    expect(response.headers.get('Content-Security-Policy')).toBe(POLICY);
    expect(response.headers.get('Reporting-Endpoints')).toBe(
      'csp-endpoint="/csp/reports"',
    );
  });

  it('keeps the page at the edge, so the second visit is a hit', async () => {
    const cache = memoryCache();
    const first = await serve(new Request('https://mrida.ng/'), {}, ctx, {
      app,
      cache,
    });
    expect(first.headers.get('Server-Timing')).toMatch(/edge;desc="miss"/);
    await Promise.resolve();
    const second = await serve(new Request('https://mrida.ng/'), {}, ctx, {
      app: forbidden,
      cache,
    });
    expect(second.headers.get('Server-Timing')).toMatch(
      /^total;dur=[\d.]+, edge;desc="hit"$/,
    );
  });

  it('refuses a caller over the limit with 429 before the app runs', async () => {
    const env = {
      RL_SITE: { limit: () => Promise.resolve({ success: false }) },
    };
    const response = await serve(new Request('https://mrida.ng/'), env, ctx, {
      app: forbidden,
    });
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('lets the request through when a binding is missing or failing', async () => {
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const failing = {
      RL_SITE: { limit: () => Promise.reject(new Error('down')) },
    };
    for (const env of [{}, failing]) {
      const response = await serve(new Request('https://mrida.ng/'), env, ctx, {
        app,
      });
      expect(response.status).toBe(200);
    }
    error.mockRestore();
  });
});
