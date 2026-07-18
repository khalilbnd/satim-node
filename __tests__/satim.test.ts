import { Satim } from '../src/client/satim';
import {
  SatimConfigError,
  SatimApiError,
  SatimValidationError,
  SatimNetworkError,
  SDKErrorCode,
} from '../src/errors';
import { OrderStatus } from '../src/types';
import { centimesToDZD, DZDToCentimes } from '../src/utils';

function mockFetch(data: object, init?: { status?: number; ok?: boolean }): jest.Mock {
  const status = init?.status ?? 200;
  const ok = init?.ok ?? (status >= 200 && status < 300);
  const fn = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function mockFetchSequence(
  responses: Array<{ data?: object; status?: number; error?: Error; jsonError?: boolean }>
): jest.Mock {
  const fn = jest.fn();
  for (const r of responses) {
    if (r.error) {
      fn.mockRejectedValueOnce(r.error);
    } else {
      const status = r.status ?? 200;
      const ok = status >= 200 && status < 300;
      fn.mockResolvedValueOnce({
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        json: r.jsonError
          ? async () => {
              throw new SyntaxError('bad json');
            }
          : async () => r.data ?? {},
      });
    }
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const baseConfig = {
  username: 'u',
  password: 'p',
  terminalId: 't',
  sandbox: true,
} as const;

const validRegister = {
  orderNumber: 'ORD-001',
  amount: 150000,
  returnUrl: 'https://example.dz/success',
  failUrl: 'https://example.dz/fail',
  description: 'Test order',
};

describe('Satim — constructor validation', () => {
  it('throws SatimConfigError when username is empty', () => {
    expect(() => new Satim({ username: '', password: 'p', terminalId: 't' })).toThrow(
      SatimConfigError
    );
  });

  it('throws SatimConfigError when password is missing', () => {
    expect(() => new Satim({ username: 'u', password: '', terminalId: 't' })).toThrow(
      SatimConfigError
    );
  });

  it('throws SatimConfigError when terminalId is missing', () => {
    expect(() => new Satim({ username: 'u', password: 'p', terminalId: '' })).toThrow(
      SatimConfigError
    );
  });

  it('throws on invalid timeout', () => {
    expect(() => new Satim({ ...baseConfig, timeout: -1 })).toThrow(SatimConfigError);
  });

  it('throws on invalid operation timeout', () => {
    expect(() => new Satim({ ...baseConfig, timeouts: { registerOrder: 0 } })).toThrow(
      SatimConfigError
    );
  });

  it('constructs successfully with valid config', () => {
    expect(() => new Satim(baseConfig)).not.toThrow();
  });

  it('rejects http baseUrl without allowInsecureHttp', () => {
    expect(
      () =>
        new Satim({
          ...baseConfig,
          baseUrl: 'http://localhost:3000/payment/rest',
        })
    ).toThrow(SatimConfigError);

    try {
      new Satim({
        ...baseConfig,
        baseUrl: 'http://localhost:3000/payment/rest',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(SatimConfigError);
      expect((err as SatimConfigError).code).toBe(SDKErrorCode.SSL_REQUIRED);
    }
  });

  it('allows http baseUrl when allowInsecureHttp is true', () => {
    expect(
      () =>
        new Satim({
          ...baseConfig,
          baseUrl: 'http://localhost:3000/payment/rest',
          allowInsecureHttp: true,
        })
    ).not.toThrow();
  });

  it('warns via logger when verifySsl is false', () => {
    const warn = jest.fn();
    new Satim({
      ...baseConfig,
      verifySsl: false,
      logger: { warn },
    });
    expect(warn).toHaveBeenCalled();
  });
});

describe('Satim.registerOrder()', () => {
  it('returns orderId and formUrl on success', async () => {
    mockFetch({ errorCode: 0, orderId: 'satim-id-123', formUrl: 'https://test.satim.dz/pay' });
    const satim = new Satim(baseConfig);
    const result = await satim.registerOrder(validRegister);
    expect(result.orderId).toBe('satim-id-123');
    expect(result.formUrl).toBe('https://test.satim.dz/pay');
  });

  it('throws SatimApiError when errorCode is non-zero', async () => {
    mockFetch({ errorCode: 1, errorMessage: 'Order number already exists' });
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder(validRegister)).rejects.toThrow(SatimApiError);
  });

  it('throws when amount is zero', async () => {
    mockFetch({});
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder({ ...validRegister, amount: 0 })).rejects.toThrow(
      SatimValidationError
    );
  });

  it('throws when returnUrl is invalid', async () => {
    mockFetch({});
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder({ ...validRegister, returnUrl: 'not-a-url' })).rejects.toThrow(
      SatimValidationError
    );
  });

  it('throws when orderId/formUrl missing on success code', async () => {
    mockFetch({ errorCode: 0 });
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder(validRegister)).rejects.toThrow(SatimApiError);
  });

  it('sanitizes additionalParams and rejects prototype pollution', async () => {
    mockFetch({ errorCode: 0, orderId: 'id', formUrl: 'https://pay.example' });
    const satim = new Satim(baseConfig);
    await expect(
      satim.registerOrder({
        ...validRegister,
        additionalParams: JSON.parse('{"__proto__":{"polluted":"yes"},"ok":"1"}') as Record<
          string,
          string
        >,
      })
    ).rejects.toThrow(SatimValidationError);
  });
});

describe('Satim.getOrderStatus()', () => {
  it('parses a successful status response', async () => {
    mockFetch({
      errorCode: 0,
      orderStatus: 2,
      orderNumber: 'ORD-001',
      amount: 150000,
      currency: '012',
      actionCode: 0,
      cardAuthInfo: { pan: '411111******1111', expiration: '2512' },
    });

    const satim = new Satim(baseConfig);
    const status = await satim.getOrderStatus({ orderId: 'satim-id-123' });

    expect(status.orderStatus).toBe(OrderStatus.AUTHORIZED);
    expect(status.orderNumber).toBe('ORD-001');
    expect(status.amount).toBe(150000);
    expect(status.cardAuthInfo?.maskedPan).toBe('411111******1111');
  });

  it('correctly identifies a successful payment', async () => {
    mockFetch({
      errorCode: 0,
      orderStatus: 2,
      orderNumber: 'ORD-001',
      amount: 150000,
      currency: '012',
      actionCode: 0,
    });
    const satim = new Satim(baseConfig);
    const status = await satim.getOrderStatus({ orderId: 'satim-id-123' });
    expect(satim.isPaymentSuccessful(status)).toBe(true);
  });

  it('correctly identifies a failed payment', async () => {
    mockFetch({
      errorCode: 0,
      orderStatus: 6,
      orderNumber: 'ORD-001',
      amount: 150000,
      currency: '012',
      actionCode: 0,
    });
    const satim = new Satim(baseConfig);
    const status = await satim.getOrderStatus({ orderId: 'satim-id-123' });
    expect(satim.isPaymentSuccessful(status)).toBe(false);
  });

  it('throws SatimApiError on non-zero errorCode', async () => {
    mockFetch({ errorCode: 2, errorMessage: 'Order not found' });
    const satim = new Satim(baseConfig);
    await expect(satim.getOrderStatus({ orderId: 'x' })).rejects.toThrow(SatimApiError);
  });
});

describe('Satim.confirmOrder / refundOrder / reverseOrder', () => {
  it('confirmOrder returns success: true on errorCode 0', async () => {
    mockFetch({ errorCode: 0 });
    const satim = new Satim(baseConfig);
    const res = await satim.confirmOrder({ orderId: 'satim-id-123', amount: 150000 });
    expect(res.success).toBe(true);
    expect(res.errorCode).toBe(0);
  });

  it('confirmOrder returns success: false on non-zero errorCode', async () => {
    mockFetch({ errorCode: 7, errorMessage: 'Invalid amount' });
    const satim = new Satim(baseConfig);
    const res = await satim.confirmOrder({ orderId: 'satim-id-123', amount: 150000 });
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe(7);
  });

  it('refundOrder returns success', async () => {
    mockFetch({ errorCode: 0 });
    const satim = new Satim(baseConfig);
    const res = await satim.refundOrder({ orderId: 'id', amount: 1000 });
    expect(res.success).toBe(true);
  });

  it('reverseOrder returns success', async () => {
    mockFetch({ errorCode: 0 });
    const satim = new Satim(baseConfig);
    const res = await satim.reverseOrder({ orderId: 'id' });
    expect(res.success).toBe(true);
  });
});

describe('Utility functions', () => {
  it('converts centimes to DZD', () => {
    expect(centimesToDZD(100000)).toBe(1000);
    expect(centimesToDZD(150000)).toBe(1500);
  });

  it('converts DZD to centimes', () => {
    expect(DZDToCentimes(1000)).toBe(100000);
    expect(DZDToCentimes(1500.5)).toBe(150050);
  });
});

describe('Network error mapping', () => {
  it('maps HTTP 401 to UNAUTHORIZED', async () => {
    mockFetch({}, { status: 401, ok: false });
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder(validRegister)).rejects.toMatchObject({
      code: SDKErrorCode.UNAUTHORIZED,
    });
  });

  it('maps HTTP 429 to RATE_LIMIT', async () => {
    mockFetch({}, { status: 429, ok: false });
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder(validRegister)).rejects.toMatchObject({
      code: SDKErrorCode.RATE_LIMIT,
    });
  });

  it('maps malformed JSON to INVALID_RESPONSE', async () => {
    mockFetchSequence([{ status: 200, jsonError: true }]);
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder(validRegister)).rejects.toMatchObject({
      code: SDKErrorCode.INVALID_RESPONSE,
    });
  });

  it('maps AbortError to TIMEOUT', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    mockFetchSequence([{ error: abortErr }]);
    const satim = new Satim({ ...baseConfig, timeout: 50 });
    await expect(satim.registerOrder(validRegister)).rejects.toMatchObject({
      code: SDKErrorCode.TIMEOUT,
    });
  });

  it('maps generic network failures to NETWORK_ERROR', async () => {
    mockFetchSequence([{ error: new Error('ECONNREFUSED') }]);
    const satim = new Satim(baseConfig);
    await expect(satim.registerOrder(validRegister)).rejects.toBeInstanceOf(SatimNetworkError);
  });
});
