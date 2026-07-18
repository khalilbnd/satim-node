/**
 * Coerce a raw SATIM errorCode (string or number) to a number.
 */
export function parseErrorCode(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isNaN(n) ? -1 : n;
}

/**
 * Coerce a raw SATIM amount (string or number) to a number (centimes).
 */
export function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
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
