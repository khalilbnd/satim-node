import { Satim } from '../../src/client/satim';
import { SatimHttpClient } from '../../src/http/client';
import { mapOrderStatusResponse } from '../../src/models/order-status';
import { OrderStatus, SatimLanguage } from '../../src/types';
import { SDKErrorCode } from '../../src/errors';

describe('mapOrderStatusResponse optional fields', () => {
  it('includes optional description/date/actionCodeDescription', () => {
    const mapped = mapOrderStatusResponse({
      errorCode: 0,
      orderStatus: OrderStatus.AUTHORIZED,
      orderNumber: 'N',
      amount: 10,
      currency: '012',
      actionCode: 0,
      orderDescription: 'd',
      date: '2026-01-01',
      actionCodeDescription: 'ok',
      cardAuthInfo: { pan: '4111' },
    });
    expect(mapped.orderDescription).toBe('d');
    expect(mapped.date).toBe('2026-01-01');
    expect(mapped.actionCodeDescription).toBe('ok');
    expect(mapped.cardAuthInfo?.maskedPan).toBe('4111');
  });
});

describe('Satim branch coverage', () => {
  const base = { username: 'u', password: 'p', terminalId: 't', sandbox: true };

  function okFetch(data: object): void {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => data,
    }) as unknown as typeof fetch;
  }

  it('uses failUrl when provided and language override', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ errorCode: 0, orderId: '1', formUrl: 'https://pay' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const satim = new Satim(base);
    await satim.registerOrder({
      orderNumber: 'O',
      amount: 100,
      returnUrl: 'https://ok.dz',
      failUrl: 'https://fail.dz',
      language: SatimLanguage.AR,
    });

    const body = String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body);
    expect(body).toContain('failUrl=https%3A%2F%2Ffail.dz');
    expect(body).toContain('language=AR');
  });

  it('validates failUrl', async () => {
    okFetch({});
    const satim = new Satim(base);
    await expect(
      satim.registerOrder({
        orderNumber: 'O',
        amount: 100,
        returnUrl: 'https://ok.dz',
        failUrl: 'bad',
      })
    ).rejects.toThrow();
  });

  it('honors per-request timeout and signal options', async () => {
    okFetch({ errorCode: 0, orderId: '1', formUrl: 'https://pay' });
    const satim = new Satim({
      ...base,
      timeouts: {
        registerOrder: 1000,
        status: 1000,
        confirmOrder: 1000,
        refund: 1000,
        reverse: 1000,
      },
    });
    const controller = new AbortController();
    await satim.registerOrder(
      { orderNumber: 'O', amount: 100, returnUrl: 'https://ok.dz' },
      { timeout: 9000, signal: controller.signal }
    );
    await satim.getOrderStatus({ orderId: '1' }, { timeout: 8000 });
    await satim.confirmOrder({ orderId: '1', amount: 100 }, { timeout: 7000 });
    await satim.refundOrder({ orderId: '1', amount: 50 }, { timeout: 6000 });
    await satim.reverseOrder({ orderId: '1' }, { timeout: 5000 });
  });

  it('returns errorMessage on confirm/refund/reverse failures', async () => {
    okFetch({ errorCode: 7, errorMessage: 'nope' });
    const satim = new Satim(base);
    expect(await satim.confirmOrder({ orderId: '1', amount: 1 })).toMatchObject({
      success: false,
      errorMessage: 'nope',
    });
    expect(await satim.refundOrder({ orderId: '1', amount: 1 })).toMatchObject({
      errorMessage: 'nope',
    });
    expect(await satim.reverseOrder({ orderId: '1' })).toMatchObject({
      errorMessage: 'nope',
    });
  });

  it('rejects invalid baseUrl protocol via constructor', () => {
    expect(
      () =>
        new Satim({
          ...base,
          baseUrl: 'ftp://x',
        })
    ).toThrow();
  });
});

describe('SatimHttpClient branch coverage', () => {
  const credentials = { username: 'u', password: 'p', terminalId: 't' };

  it('uses mergeSignals when AbortSignal.any is unavailable', async () => {
    const original = AbortSignal.any;
    // @ts-expect-error force fallback path
    AbortSignal.any = undefined;

    try {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ ok: true }),
      });
      const client = new SatimHttpClient(
        {
          baseUrl: 'https://test.satim.dz/payment/rest',
          credentials,
          defaultTimeout: 5000,
          timeouts: {},
          retries: { maxRetries: 0, baseDelayMs: 1, retryOnNetworkError: true },
        },
        fetchImpl as unknown as typeof fetch
      );
      await client.post('/register.do', {});
      expect(fetchImpl).toHaveBeenCalled();
    } finally {
      AbortSignal.any = original;
    }
  });

  it('aborts when external signal is already aborted', async () => {
    const fetchImpl = jest.fn();
    const client = new SatimHttpClient(
      {
        baseUrl: 'https://test.satim.dz/payment/rest',
        credentials,
        defaultTimeout: 5000,
        timeouts: {},
        retries: { maxRetries: 0, baseDelayMs: 1, retryOnNetworkError: true },
      },
      fetchImpl as unknown as typeof fetch
    );

    const controller = new AbortController();
    controller.abort();

    // Force mergeSignals path
    const original = AbortSignal.any;
    // @ts-expect-error force fallback
    AbortSignal.any = undefined;
    try {
      fetchImpl.mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
            return;
          }
          signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      await expect(
        client.post('/register.do', {}, { signal: controller.signal })
      ).rejects.toMatchObject({ code: SDKErrorCode.TIMEOUT });
    } finally {
      AbortSignal.any = original;
    }
  });

  it('does not retry non-retryable errors', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({}),
    });
    const client = new SatimHttpClient(
      {
        baseUrl: 'https://test.satim.dz/payment/rest',
        credentials,
        defaultTimeout: 5000,
        timeouts: {},
        retries: { maxRetries: 2, baseDelayMs: 1, retryOnNetworkError: true },
      },
      fetchImpl as unknown as typeof fetch
    );
    await expect(client.post('/register.do', {})).rejects.toMatchObject({ status: 400 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 then succeeds', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'ERR',
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ errorCode: 0 }),
      });

    const warn = jest.fn();
    const client = new SatimHttpClient(
      {
        baseUrl: 'https://test.satim.dz/payment/rest',
        credentials,
        defaultTimeout: 5000,
        timeouts: {},
        retries: { maxRetries: 1, baseDelayMs: 1, retryOnNetworkError: true },
        logger: { warn },
      },
      fetchImpl as unknown as typeof fetch
    );
    await expect(client.post('/register.do', {}, { operation: 'registerOrder' })).resolves.toEqual({
      errorCode: 0,
    });
    expect(warn).toHaveBeenCalled();
  });
});
