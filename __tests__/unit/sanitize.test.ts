import { sanitizeObject, sanitizeStringRecord } from '../../src/security/sanitize';
import { SatimValidationError } from '../../src/errors';

describe('sanitizeObject — prototype pollution protection', () => {
  it('rejects __proto__ key', () => {
    const malicious = JSON.parse('{"__proto__":{"admin":true},"name":"ok"}');
    expect(() => sanitizeObject(malicious)).toThrow(SatimValidationError);
    expect(() => sanitizeObject(malicious)).toThrow(/__proto__/);
  });

  it('rejects constructor key', () => {
    expect(() =>
      sanitizeObject({ constructor: { prototype: { polluted: true } } } as never)
    ).toThrow(/constructor/);
  });

  it('rejects prototype key', () => {
    expect(() => sanitizeObject({ prototype: {} } as never)).toThrow(/prototype/);
  });

  it('rejects nested dangerous keys', () => {
    expect(() => sanitizeObject({ nested: JSON.parse('{"__proto__":{"x":1}}') })).toThrow(
      /__proto__/
    );
  });

  it('copies safe keys into a null-prototype object', () => {
    const clean = sanitizeObject({ a: '1', b: '2' });
    expect(clean.a).toBe('1');
    expect(clean.b).toBe('2');
    expect(Object.getPrototypeOf(clean)).toBe(null);
  });

  it('does not pollute Object.prototype', () => {
    const before = Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted');
    try {
      sanitizeObject(JSON.parse('{"__proto__":{"polluted":true}}'));
    } catch {
      // expected
    }
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(before);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('sanitizeStringRecord rejects non-string values', () => {
    expect(() => sanitizeStringRecord({ a: 1 } as unknown as Record<string, string>)).toThrow(
      SatimValidationError
    );
  });

  it('sanitizeStringRecord returns undefined for undefined input', () => {
    expect(sanitizeStringRecord(undefined)).toBeUndefined();
  });

  it('sanitizeStringRecord accepts safe string maps', () => {
    expect(sanitizeStringRecord({ force_terminal: 'ECOM' })).toEqual({
      force_terminal: 'ECOM',
    });
  });
});
