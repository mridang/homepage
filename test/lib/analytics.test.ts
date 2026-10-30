import { describe, expect, it } from '@jest/globals';

import { BEACON_CONNECT_SOURCE, BEACON_SCRIPT_SOURCE } from '@/lib/analytics';

describe('Cloudflare Web Analytics sources', () => {
  it('loads the beacon from Cloudflare over https', () => {
    expect(BEACON_SCRIPT_SOURCE).toBe('https://static.cloudflareinsights.com');
  });

  it('lets the beacon report to Cloudflare over https', () => {
    expect(BEACON_CONNECT_SOURCE).toBe('https://cloudflareinsights.com');
  });
});
