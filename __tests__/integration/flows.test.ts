import { Satim } from '../../src/client/satim';
import { SDKErrorCode, SatimNetworkError, SatimApiError } from '../../src/errors';

/**
 * Integration-style tests using a mocked fetch transport that exercises
 * full client flows end-to-end without hitting the live SATIM network.
 */

const config = {
  username: 'merchant',
  password: 'secret',
  terminalId: 'TERM01',
  sandbox: true,
  timeouts: {
    registerOrder: 5_000,
    status: 5_000,
    confirmOrder: 5_000,
    refund: 5_000,
  },
} as const;

function installFetch(handler: (url: string, init?: RequestInit) => Promise<Response>): void {
  global.fetch = jest.fn(handler) as unknown as typeof fetch;
}

describe('integration — successful payment flow', () => {
  it('register → status → confirm', async () => {
    installFetch(async (url) => {
      if (url.includes('register.do')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            errorCode: 0,
            orderId: 'ORD-SATIM-1',
            formUrl: 'https://test.satim.dz/pay/ORD-SATIM-1',
          }),
        } as unknown as Response;
      }
      if (url.includes('getOrderStatusExtended.do')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            errorCode: 0,
            orderStatus: 1,
            orderNumber: 'INV-1',
            amount: 50000,
            currency: '012',
            actionCode: 0,
          }),
        } as unknown as Response;
      }
      if (url.includes('confirmOrder.do')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ errorCode: 0 }),
        } as unknown as Response;
      }
      throw new Error(`unexpected url ${url}`);
    });

    const satim = new Satim(config);
    const reg = await satim.registerOrder({
      orderNumber: 'INV-1',
      amount: 50000,
      returnUrl: 'https://shop.dz/ok',
      failUrl: 'https://shop.dz/fail',
    });
    expect(reg.orderId).toBe('ORD-SATIM-1');

    const status = await satim.getOrderStatus({ orderId: reg.orderId });
    expect(satim.isPaymentSuccessful(status)).toBe(true);

    const confirm = await satim.confirmOrder({ orderId: reg.orderId, amount: 50000 });
    expect(confirm.success).toBe(true);
  });
});

describe('integration — failure modes', () => {
  it('handles timeout', async () => {
    installFetch(async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });

    const satim = new Satim({ ...config, timeout: 10 });
    await expect(
      satim.registerOrder({
        orderNumber: 'T-1',
        amount: 1000,
        returnUrl: 'https://shop.dz/ok',
      })
    ).rejects.toMatchObject({ code: SDKErrorCode.TIMEOUT });
  });

  it('handles network failure', async () => {
    installFetch(async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    });

    const satim = new Satim(config);
    await expect(
      satim.registerOrder({
        orderNumber: 'T-2',
        amount: 1000,
        returnUrl: 'https://shop.dz/ok',
      })
    ).rejects.toBeInstanceOf(SatimNetworkError);
  });

  it('handles invalid credentials (API error)', async () => {
    installFetch(
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ errorCode: 5, errorMessage: 'Access denied' }),
        }) as unknown as Response
    );

    const satim = new Satim(config);
    await expect(
      satim.registerOrder({
        orderNumber: 'T-3',
        amount: 1000,
        returnUrl: 'https://shop.dz/ok',
      })
    ).rejects.toBeInstanceOf(SatimApiError);
  });

  it('handles malformed responses', async () => {
    installFetch(
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => {
            throw new SyntaxError('Unexpected token');
          },
        }) as unknown as unknown as Response
    );

    const satim = new Satim(config);
    await expect(
      satim.registerOrder({
        orderNumber: 'T-4',
        amount: 1000,
        returnUrl: 'https://shop.dz/ok',
      })
    ).rejects.toMatchObject({ code: SDKErrorCode.INVALID_RESPONSE });
  });
});

describe('integration — duplicate / idempotent registerOrder', () => {
  it('deduplicates concurrent duplicate requests', async () => {
    let hits = 0;
    installFetch(async () => {
      hits += 1;
      await new Promise((r) => setTimeout(r, 40));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          errorCode: 0,
          orderId: 'SAME',
          formUrl: 'https://test.satim.dz/pay',
        }),
      } as unknown as Response;
    });

    const satim = new Satim(config);
    const params = {
      orderNumber: 'DUP-1',
      amount: 2000,
      returnUrl: 'https://shop.dz/ok',
      idempotencyKey: 'idem-dup-1',
    };

    const [a, b] = await Promise.all([satim.registerOrder(params), satim.registerOrder(params)]);

    expect(a.orderId).toBe('SAME');
    expect(b.orderId).toBe('SAME');
    expect(hits).toBe(1);
  });
});

describe('integration — SSL enforcement', () => {
  it('rejects insecure custom base URL in production-like config', () => {
    expect(
      () =>
        new Satim({
          username: 'u',
          password: 'p',
          terminalId: 't',
          baseUrl: 'http://evil.example/payment/rest',
        })
    ).toThrow(/HTTPS is required/);
  });

  it('allows local mock over HTTP when explicitly enabled', async () => {
    installFetch(
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            errorCode: 0,
            orderId: 'local',
            formUrl: 'http://localhost/pay',
          }),
        }) as unknown as Response
    );

    const satim = new Satim({
      username: 'u',
      password: 'p',
      terminalId: 't',
      baseUrl: 'http://127.0.0.1:9999/payment/rest',
      allowInsecureHttp: true,
    });

    const result = await satim.registerOrder({
      orderNumber: 'LOCAL-1',
      amount: 100,
      returnUrl: 'https://shop.dz/ok',
    });
    expect(result.orderId).toBe('local');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('http://127.0.0.1:9999'),
      expect.any(Object)
    );
  });
});
