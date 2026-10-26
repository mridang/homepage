import { describe, expect, it, jest } from '@jest/globals';

import { POST } from '@/pages/csp/reports';

const send = (body: string) =>
  POST({
    request: new Request('https://mrida.ng/csp/reports', {
      method: 'POST',
      body,
    }),
  } as never) as Promise<Response>;

describe('POST /csp/reports', () => {
  it('takes in a report with 204 and logs it as one line', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const response = await send(
      JSON.stringify({
        'csp-report': {
          'blocked-uri': 'inline',
          'document-uri': 'https://mrida.ng/',
        },
      }),
    );
    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toBe('[csp-report]');
    log.mockRestore();
  });

  it('refuses a body that is not JSON with 400', async () => {
    expect((await send('nope')).status).toBe(400);
  });

  it('refuses a body over 16 KiB with 413', async () => {
    expect((await send('x'.repeat(20_000))).status).toBe(413);
  });
});
