import {
  parseErrorCode,
  parseAmount,
  isSuccessResponse,
  parseCardAuthInfo,
  requireString,
  validateUrl,
  validateAmount,
  getLocalizedMessage,
} from '../../src/utils';
import { SatimValidationError, SDKError, SDKErrorCode, SatimApiError } from '../../src/errors';

describe('parse helpers', () => {
  it('parseErrorCode handles edge cases', () => {
    expect(parseErrorCode(undefined)).toBe(0);
    expect(parseErrorCode('')).toBe(0);
    expect(parseErrorCode('5')).toBe(5);
    expect(parseErrorCode('x')).toBe(-1);
  });

  it('parseAmount handles edge cases', () => {
    expect(parseAmount(undefined)).toBe(0);
    expect(parseAmount('1500')).toBe(1500);
    expect(parseAmount('x')).toBe(0);
  });

  it('isSuccessResponse', () => {
    expect(isSuccessResponse({ errorCode: 0 })).toBe(true);
    expect(isSuccessResponse({ errorCode: '1' })).toBe(false);
  });

  it('parseCardAuthInfo maps pan aliases', () => {
    expect(parseCardAuthInfo(undefined)).toEqual({});
    expect(parseCardAuthInfo({ pan: '4111', expiration: '2512' })).toEqual({
      maskedPan: '4111',
      expiration: '2512',
    });
  });
});

describe('validation helpers', () => {
  it('requireString', () => {
    expect(requireString('  hi  ', 'f')).toBe('hi');
    expect(() => requireString('', 'f')).toThrow(SatimValidationError);
  });

  it('validateUrl', () => {
    expect(() => validateUrl('https://ok.dz', 'u')).not.toThrow();
    expect(() => validateUrl('bad', 'u')).toThrow(SatimValidationError);
  });

  it('validateAmount', () => {
    expect(() => validateAmount(100)).not.toThrow();
    expect(() => validateAmount(0)).toThrow(SatimValidationError);
    expect(() => validateAmount(1.5)).toThrow(SatimValidationError);
  });
});

describe('translations', () => {
  it('returns localized messages', () => {
    expect(getLocalizedMessage(116, 'en')).toContain('Insufficient');
    expect(getLocalizedMessage(116, 'ar')).toBeTruthy();
    expect(getLocalizedMessage(116, 'fr')).toContain('Solde');
    expect(getLocalizedMessage(99999)).toContain('Unknown');
  });
});

describe('SDKError', () => {
  it('serializes structured fields', () => {
    const err = new SDKError({
      code: SDKErrorCode.TIMEOUT,
      message: 'timed out',
      operation: 'registerOrder',
      requestId: 'r1',
      status: 408,
    });
    expect(err.toJSON()).toMatchObject({
      code: SDKErrorCode.TIMEOUT,
      operation: 'registerOrder',
      requestId: 'r1',
    });
  });

  it('SatimApiError exposes legacy fields', () => {
    const err = new SatimApiError(1, 'dup', { errorCode: 1 }, 'registerOrder');
    expect(err.errorCode).toBe(1);
    expect(err.errorMessage).toBe('dup');
    expect(err.code).toBe(SDKErrorCode.API_ERROR);
    expect(err).toBeInstanceOf(SDKError);
  });
});
