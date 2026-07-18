import { assertValidUrl } from '../../src/security/url';
import { SatimConfigError } from '../../src/errors';
import { buildRegisterPayload } from '../../src/services/orders';
import { SatimLanguage, SatimCurrency } from '../../src/types';
import { centimesToDZD, DZDToCentimes } from '../../src/utils/amount';
import { parseCardAuthInfo } from '../../src/utils/parse';
import { IdempotencyGuard } from '../../src/security/idempotency';
import { sanitizeObject } from '../../src/security/sanitize';
import {
  SatimValidationError,
  SatimError,
  SatimNetworkError,
  SDKErrorCode,
} from '../../src/errors';
import { SDKError } from '../../src/errors/sdk-error';

describe('assertValidUrl', () => {
  it('accepts valid URLs', () => {
    expect(() => assertValidUrl('https://example.dz/ok', 'returnUrl')).not.toThrow();
  });

  it('rejects invalid URLs', () => {
    expect(() => assertValidUrl('not-a-url', 'returnUrl')).toThrow(SatimConfigError);
  });
});

describe('buildRegisterPayload', () => {
  it('builds defaults and serializes sanitized additionalParams', () => {
    const payload = buildRegisterPayload({
      orderNumber: 'O1',
      amount: 100,
      returnUrl: 'https://a.dz/ok',
      description: 'desc',
      additionalParams: { force_terminal: 'ECOM' },
    });
    expect(payload['currency']).toBe(SatimCurrency.DZD);
    expect(payload['language']).toBe(SatimLanguage.FR);
    expect(payload['failUrl']).toBe('https://a.dz/ok');
    expect(payload['description']).toBe('desc');
    expect(payload['jsonParams']).toBe(JSON.stringify({ force_terminal: 'ECOM' }));
  });
});

describe('amount helpers', () => {
  it('round-trips DZD conversions', () => {
    expect(centimesToDZD(DZDToCentimes(12.34))).toBe(12.34);
  });
});

describe('parseCardAuthInfo completeness', () => {
  it('maps all known fields', () => {
    expect(
      parseCardAuthInfo({
        maskedPan: '4111',
        expiration: '2512',
        cardholderName: 'A',
        approvalCode: 'OK',
        authCode: '1',
      })
    ).toEqual({
      maskedPan: '4111',
      expiration: '2512',
      cardholderName: 'A',
      approvalCode: 'OK',
      authCode: '1',
    });
  });
});

describe('IdempotencyGuard.clear', () => {
  it('clears in-flight map', async () => {
    const guard = new IdempotencyGuard();
    const p = guard.run('x', () => new Promise((r) => setTimeout(() => r(1), 50)));
    expect(guard.size).toBe(1);
    guard.clear();
    expect(guard.size).toBe(0);
    await p;
  });
});

describe('sanitize edge cases', () => {
  it('rejects non-plain objects', () => {
    expect(() => sanitizeObject(null as never)).toThrow(SatimValidationError);
    expect(() => sanitizeObject([] as never)).toThrow(SatimValidationError);
  });

  it('rejects symbol keys', () => {
    const sym = Symbol('s');
    const obj = { a: '1' } as Record<string | symbol, unknown>;
    obj[sym] = 'x';
    expect(() => sanitizeObject(obj as Record<string, unknown>)).toThrow(SatimValidationError);
  });

  it('rejects excessive nesting', () => {
    let nested: Record<string, unknown> = { v: 'ok' };
    for (let i = 0; i < 12; i += 1) {
      nested = { child: nested };
    }
    expect(() => sanitizeObject(nested, { maxDepth: 5 })).toThrow(/depth/);
  });

  it('sanitizes nested plain objects and arrays of objects', () => {
    const clean = sanitizeObject({
      a: { b: '1' },
      list: [{ c: '2' }],
    });
    expect((clean['a'] as Record<string, unknown>)['b']).toBe('1');
    expect(((clean['list'] as unknown[])[0] as Record<string, unknown>)['c']).toBe('2');
  });

  it('rejects nested arrays', () => {
    expect(() => sanitizeObject({ list: [[1]] as unknown as string })).toThrow(/Nested arrays/);
  });
});

describe('error class coverage', () => {
  it('SatimError defaults to UNKNOWN', () => {
    const err = new SatimError('x');
    expect(err.code).toBe(SDKErrorCode.UNKNOWN);
  });

  it('SatimNetworkError with options', () => {
    const err = new SatimNetworkError('n', new Error('c'), {
      status: 500,
      operation: 'refund',
      requestId: 'r',
      code: SDKErrorCode.NETWORK_ERROR,
    });
    expect(err.status).toBe(500);
    expect(err.operation).toBe('refund');
  });

  it('SDKError sets optional fields when provided', () => {
    const err = new SDKError({
      code: SDKErrorCode.INVALID_SIGNATURE,
      message: 'bad sig',
      status: 400,
      operation: 'token',
      requestId: 'id',
      cause: new Error('x'),
      apiErrorCode: 9,
      field: 'f',
      raw: { a: 1 },
    });
    expect(err.apiErrorCode).toBe(9);
    expect(err.field).toBe('f');
    expect(err.raw).toEqual({ a: 1 });
  });
});
