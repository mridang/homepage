import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';

import {
  applyResponseHeaders,
  SECURITY_HEADERS,
} from '@/lib/core/http/headers';

/** The headers listed under `/*` in public/_headers. */
function catchAllRule(): Record<string, string> {
  const rule: Record<string, string> = {};
  let inRule = false;
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (/^\S/.test(line) && !line.startsWith('#')) {
      inRule = line === '/*';
    } else if (inRule && /^\s+\S/.test(line)) {
      const [name = '', ...value] = line.trim().split(':');
      rule[name] = value.join(':').trim();
    }
  }
  return rule;
}

describe('public/_headers', () => {
  it('carries the Worker security headers for static files', () => {
    const rule = catchAllRule();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (name === 'Content-Security-Policy') {
        expect(rule[name]).toMatch(/^frame-ancestors 'none'/);
      } else {
        expect(rule[name]).toBe(value);
      }
    }
    expect(rule['Cross-Origin-Resource-Policy']).toBe('same-site');
  });
});

describe('applyResponseHeaders', () => {
  it('sends the full standard set on a page', () => {
    const response = applyResponseHeaders(
      new Request('https://mrida.ng/'),
      new Response('x', { headers: { 'content-type': 'text/html' } }),
    );
    const expected: Record<string, string> = {
      'strict-transport-security':
        'max-age=63072000; includeSubDomains; preload',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy':
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      'x-frame-options': 'DENY',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-site',
      'origin-agent-cluster': '?1',
      'reporting-endpoints': 'csp-endpoint="/csp/reports"',
    };
    for (const [name, value] of Object.entries(expected)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });
});
