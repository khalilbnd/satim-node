import { encodeFormBody, createRequestId, sleep } from '../../src/http/helpers';
import { SatimHttpClient } from '../../src/http/client';
import { SDKErrorCode, SatimNetworkError } from '../../src/errors';

describe('HTTP helpers', () => {
  it('encodeFormBody skips nullish and objects', () => {
    const encoded = encodeFormBody({
      a: '1',
      b: 2,
      c: null,
      d: undefined,
      e: { nested: true },
    });
    expect(encoded).toContain('a=1');
    expect(encoded).toContain('b=2');
    expect(encoded).not.toContain('c=');
    expect(encoded).not.toContain('e=');
  });

  it('createRequestId returns opaque ids', () => {
    const id = createRequestId();
    expect(id.startsWith('satim_')).toBe(true);
  });

  it('sleep resolves', async () => {
    const start = Date.now();
    await sleep(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});

describe('SatimHttpClient', () => {
  const credentials = { username: 'u', password: 'p', terminalId: 't' };

  function createClient(
    fetchImpl: typeof fetch,
    overrides: Partial<ConstructorParameters<typeof SatimHttpClient>[0]> = {}
  ): SatimHttpClient {
    return new SatimHttpClient(
      {
        baseUrl: 'https://test.satim.dz/payment/rest',
        credentials,
        defaultTimeout: 5_000,
        timeouts: {},
        retries: { maxRetries: 0, baseDelayMs: 10, retryOnNetworkError: true },
        ...overrides,
      },
      fetchImpl
    );
  }

  it('posts form body with credentials and returns JSON', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ errorCode: 0 }),
    });

    const client = createClient(fetchImpl as unknown as typeof fetch);
    const result = await client.post(
      '/register.do',
      { orderNumber: '1' },
      {
        operation: 'registerOrder',
      }
    );

    expect(result).toEqual({ errorCode: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('userName=u');
    expect(String(init.body)).toContain('password=p');
    expect(String(init.body)).toContain('orderNumber=1');
  });

  it('never passes payload to logger — only metadata', async () => {
    const debug = jest.fn();
    const info = jest.fn();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ ok: true }),
    });

    const client = createClient(fetchImpl as unknown as typeof fetch, {
      logger: { debug, info },
    });

    await client.post(
      '/register.do',
      { password: 'SECRET', pan: '4111' },
      {
        operation: 'registerOrder',
        requestId: 'req-1',
      }
    );

    const allMeta = [...debug.mock.calls, ...info.mock.calls].map((c) => c[1]);
    const serialized = JSON.stringify(allMeta);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('4111');
    expect(serialized).not.toContain('password');
    expect(allMeta[0]).toMatchObject({
      endpoint: '/register.do',
      requestId: 'req-1',
    });
  });

  it('respects per-operation timeout override resolution', () => {
    const fetchImpl = jest.fn();
    const client = createClient(fetchImpl as unknown as typeof fetch, {
      defaultTimeout: 30_000,
      timeouts: { registerOrder: 1_000, status: 2_000 },
    });
    expect(client.resolveTimeout('registerOrder')).toBe(1_000);
    expect(client.resolveTimeout('status')).toBe(2_000);
    expect(client.resolveTimeout('refund')).toBe(30_000);
    expect(client.resolveTimeout('registerOrder', 500)).toBe(500);
  });

  it('retries on network error when configured', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ errorCode: 0 }),
      });

    const client = createClient(fetchImpl as unknown as typeof fetch, {
      retries: { maxRetries: 1, baseDelayMs: 5, retryOnNetworkError: true },
    });

    const result = await client.post('/register.do', {});
    expect(result).toEqual({ errorCode: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry when maxRetries is 0', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('fail'));
    const client = createClient(fetchImpl as unknown as typeof fetch);
    await expect(client.post('/register.do', {})).rejects.toBeInstanceOf(SatimNetworkError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps HTTP 500 to network error', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    });
    const client = createClient(fetchImpl as unknown as typeof fetch);
    await expect(client.post('/register.do', {})).rejects.toMatchObject({
      code: SDKErrorCode.NETWORK_ERROR,
      status: 500,
    });
  });
});
