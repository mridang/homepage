import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  applyResponseHeaders,
  SECURITY_HEADERS,
} from '../../../../src/lib/core/http/headers.ts';

/** The headers listed under `/*` in public/_headers. */
function catchAllRule(): Record<string, string> {
  const rule: Record<string, string> = {};
  let inRule = false;
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (/^\S/.test(line) && !line.startsWith('#')) inRule = line === '/*';
    else if (inRule && /^\s+\S/.test(line)) {
      const [name = '', ...value] = line.trim().split(':');
      rule[name] = value.join(':').trim();
    }
  }
  return rule;
}

void test('public/_headers carries the Worker security headers for static files', () => {
  const rule = catchAllRule();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (name === 'Content-Security-Policy') {
      assert.ok(rule[name]?.startsWith("frame-ancestors 'none'"), name);
    } else {
      assert.equal(rule[name], value, name);
    }
  }
  assert.equal(rule['Cross-Origin-Resource-Policy'], 'same-site');
});

void test('the Worker sends the full standard set on a page', () => {
  const response = applyResponseHeaders(
    new Request('https://mrida.ng/'),
    new Response('x', { headers: { 'content-type': 'text/html' } }),
  );
  const expected: Record<string, string> = {
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
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
    assert.equal(response.headers.get(name), value, name);
  }
});
