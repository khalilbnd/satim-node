import { DANGEROUS_KEYS } from '../constants/defaults';
import { SatimValidationError } from '../errors/satim-errors';

const DANGEROUS_SET = new Set<string>(DANGEROUS_KEYS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively copies an untrusted object into a clean null-prototype map,
 * rejecting prototype-pollution keys (`__proto__`, `constructor`, `prototype`).
 *
 * Never merges into an existing target — always builds a fresh object.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  input: T,
  options?: { maxDepth?: number; path?: string }
): Record<string, unknown> {
  const maxDepth = options?.maxDepth ?? 10;
  const path = options?.path ?? 'root';

  if (maxDepth < 0) {
    throw new SatimValidationError(`Object nesting exceeds maximum depth at "${path}"`);
  }

  if (!isPlainObject(input)) {
    throw new SatimValidationError(
      `Expected a plain object at "${path}", got ${input === null ? 'null' : typeof input}`
    );
  }

  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === 'symbol') {
      throw new SatimValidationError(`Symbol keys are not allowed at "${path}"`);
    }

    if (DANGEROUS_SET.has(key)) {
      throw new SatimValidationError(
        `Dangerous key "${key}" is not allowed in user-provided parameters`,
        key
      );
    }

    const value = input[key];
    const childPath = `${path}.${key}`;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, {
        maxDepth: maxDepth - 1,
        path: childPath,
      });
    } else if (Array.isArray(value)) {
      result[key] = value.map((item, index) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          return sanitizeObject(item as Record<string, unknown>, {
            maxDepth: maxDepth - 1,
            path: `${childPath}[${index}]`,
          });
        }
        if (Array.isArray(item)) {
          throw new SatimValidationError(
            `Nested arrays are not allowed at "${childPath}[${index}]"`
          );
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitize a string-record (e.g. `additionalParams`) and return a plain object
 * safe for JSON serialization.
 */
export function sanitizeStringRecord(
  input: Record<string, string> | undefined,
  fieldName = 'additionalParams'
): Record<string, string> | undefined {
  if (input === undefined) return undefined;

  const cleaned = sanitizeObject(input as Record<string, unknown>, { path: fieldName });
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(cleaned)) {
    if (typeof value !== 'string') {
      throw new SatimValidationError(
        `"${fieldName}.${key}" must be a string`,
        `${fieldName}.${key}`
      );
    }
    result[key] = value;
  }

  return result;
}
