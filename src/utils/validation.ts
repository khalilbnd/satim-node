import { SatimValidationError } from '../errors/satim-errors';

/**
 * Validate a string is not empty.
 */
export function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SatimValidationError(`"${name}" must be a non-empty string`, name);
  }
  return value.trim();
}

/**
 * Validate a URL format.
 */
export function validateUrl(value: string, name: string): void {
  try {
    new URL(value);
  } catch {
    throw new SatimValidationError(`"${name}" must be a valid URL, got: "${value}"`, name);
  }
}

/**
 * Validate amount is a positive integer (centimes).
 */
export function validateAmount(value: number, name = 'amount'): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SatimValidationError(
      `"${name}" must be a positive integer (centimes), got: ${value}`,
      name
    );
  }
}
