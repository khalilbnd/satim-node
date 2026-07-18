import type { SatimRawResponse, CardAuthInfo } from '../types';
import { parseErrorCode } from './amount';

/**
 * Check if a raw SATIM response indicates success (errorCode === 0).
 */
export function isSuccessResponse(raw: SatimRawResponse): boolean {
  return parseErrorCode(raw.errorCode) === 0;
}

/**
 * Parse the cardAuthInfo field from a raw SATIM response.
 */
export function parseCardAuthInfo(raw: Record<string, string> | undefined): CardAuthInfo {
  if (!raw) return {};

  const result: CardAuthInfo = {};
  const maskedPan = raw['pan'] ?? raw['maskedPan'];
  const expiration = raw['expiration'];
  const cardholderName = raw['cardholderName'];
  const approvalCode = raw['approvalCode'];
  const authCode = raw['authCode'];

  if (maskedPan !== undefined) result.maskedPan = maskedPan;
  if (expiration !== undefined) result.expiration = expiration;
  if (cardholderName !== undefined) result.cardholderName = cardholderName;
  if (approvalCode !== undefined) result.approvalCode = approvalCode;
  if (authCode !== undefined) result.authCode = authCode;

  return result;
}
