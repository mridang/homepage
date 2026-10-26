import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST } from '../../../src/pages/csp/reports.ts';

const send = (body: string) =>
  POST({
    request: new Request('https://mrida.ng/csp/reports', {
      method: 'POST',
      body,
    }),
  } as never);

void test('a report is taken in with 204 and logged as one line', async () => {
  const lines: unknown[][] = [];
  const log = console.log;
  console.log = (...args: unknown[]) => void lines.push(args);
  const response = await send(
    JSON.stringify({
      'csp-report': {
        'blocked-uri': 'inline',
        'document-uri': 'https://mrida.ng/',
      },
    }),
  );
  console.log = log;
  assert.equal((response as Response).status, 204);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.[0], '[csp-report]');
});

void test('a body that is not JSON is refused with 400', async () => {
  assert.equal(((await send('nope')) as Response).status, 400);
});

void test('a body over 16 KiB is refused with 413', async () => {
  assert.equal(((await send('x'.repeat(20_000))) as Response).status, 413);
});
