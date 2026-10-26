import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SECURITY_HEADERS } from './headers.ts';

// The headers listed under `/*` in public/_headers.
function catchAllRule(): Record<string, string> {
  const rule: Record<string, string> = {};
  let inRule = false;
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (line.startsWith('/')) inRule = line === '/*';
    else if (inRule && /^\s+\S/.test(line)) {
      const [name, ...value] = line.trim().split(':');
      rule[name] = value.join(':').trim();
    }
  }
  return rule;
}

void test('public/_headers carries the same security headers as the middleware', () => {
  const rule = catchAllRule();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(rule[name], value, name);
  }
});
