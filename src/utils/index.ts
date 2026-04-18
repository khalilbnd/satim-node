import { SatimRawResponse } from '../types';

/**
 * Coerce a raw SATIM errorCode (string or number) to a number.
 */
export function parseErrorCode(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? -1 : n;
}

/**
 * Coerce a raw SATIM amount (string or number) to a number (centimes).
 */
export function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

/**
 * Convert centimes to DZD for display purposes.
 */
export function centimesToDZD(centimes: number): number {
  return centimes / 100;
}

/**
 * Convert DZD to centimes for API calls.
 */
export function DZDToCentimes(dzd: number): number {
  return Math.round(dzd * 100);
}

/**
 * Check if a raw SATIM response indicates success (errorCode === 0).
 */
export function isSuccessResponse(raw: SatimRawResponse): boolean {
  return parseErrorCode(raw.errorCode) === 0;
}

/**
 * Parse the cardAuthInfo field from a raw SATIM response.
 */
export function parseCardAuthInfo(
  raw: Record<string, string> | undefined
): {
  maskedPan?: string;
  expiration?: string;
  cardholderName?: string;
  approvalCode?: string;
  authCode?: string;
} {
  if (!raw) return {};
  return {
    maskedPan: raw['pan'] || raw['maskedPan'],
    expiration: raw['expiration'],
    cardholderName: raw['cardholderName'],
    approvalCode: raw['approvalCode'],
    authCode: raw['authCode'],
  };
}

/**
 * Validate a string is not empty.
 */
export function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`"${name}" must be a non-empty string`);
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
    throw new Error(`"${name}" must be a valid URL, got: "${value}"`);
  }
}

/**
 * Validate amount is a positive integer (centimes).
 */
export function validateAmount(value: number, name = 'amount'): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`"${name}" must be a positive integer (centimes), got: ${value}`);
  }
}
