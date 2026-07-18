import { resolveAndValidateBaseUrl } from '../../src/security/url';
import { SatimConfigError, SDKErrorCode } from '../../src/errors';
import { PRODUCTION_BASE_URL, SANDBOX_BASE_URL } from '../../src/constants';

describe('resolveAndValidateBaseUrl', () => {
  it('returns production URL by default', () => {
    expect(resolveAndValidateBaseUrl({})).toBe(PRODUCTION_BASE_URL);
  });

  it('returns sandbox URL when sandbox is true', () => {
    expect(resolveAndValidateBaseUrl({ sandbox: true })).toBe(SANDBOX_BASE_URL);
  });

  it('accepts custom https URL', () => {
    expect(resolveAndValidateBaseUrl({ baseUrl: 'https://custom.example/payment/rest' })).toBe(
      'https://custom.example/payment/rest'
    );
  });

  it('strips trailing slash', () => {
    expect(resolveAndValidateBaseUrl({ baseUrl: 'https://custom.example/payment/rest/' })).toBe(
      'https://custom.example/payment/rest'
    );
  });

  it('rejects http without allowInsecureHttp', () => {
    expect(() => resolveAndValidateBaseUrl({ baseUrl: 'http://127.0.0.1:8080' })).toThrow(
      SatimConfigError
    );

    try {
      resolveAndValidateBaseUrl({ baseUrl: 'http://127.0.0.1:8080' });
    } catch (e) {
      expect((e as SatimConfigError).code).toBe(SDKErrorCode.SSL_REQUIRED);
    }
  });

  it('allows http when allowInsecureHttp is true', () => {
    expect(
      resolveAndValidateBaseUrl({
        baseUrl: 'http://127.0.0.1:8080/rest',
        allowInsecureHttp: true,
      })
    ).toBe('http://127.0.0.1:8080/rest');
  });

  it('rejects invalid URLs', () => {
    expect(() => resolveAndValidateBaseUrl({ baseUrl: 'not-a-url' })).toThrow(SatimConfigError);
  });

  it('rejects unsupported protocols', () => {
    expect(() => resolveAndValidateBaseUrl({ baseUrl: 'ftp://example.com' })).toThrow(
      SatimConfigError
    );
    try {
      resolveAndValidateBaseUrl({ baseUrl: 'ftp://example.com' });
    } catch (e) {
      expect((e as SatimConfigError).code).toBe(SDKErrorCode.SSL_REQUIRED);
    }
  });
});
