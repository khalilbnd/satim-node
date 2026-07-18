/**
 * Payment operation helpers shared by the Satim client.
 * Keeps request-payload assembly out of the public client class.
 */

import { SatimCurrency, SatimLanguage } from '../types/enums';
import type { RegisterOrderParams } from '../types';
import { sanitizeStringRecord } from '../security';

/**
 * Build the form body fields for register.do (excluding credentials).
 */
export function buildRegisterPayload(params: RegisterOrderParams): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    orderNumber: params.orderNumber,
    amount: params.amount,
    returnUrl: params.returnUrl,
    failUrl: params.failUrl ?? params.returnUrl,
    currency: params.currency ?? SatimCurrency.DZD,
    language: params.language ?? SatimLanguage.FR,
  };

  if (params.description !== undefined) {
    payload['description'] = params.description;
  }

  if (params.additionalParams !== undefined) {
    const sanitized = sanitizeStringRecord(params.additionalParams);
    if (sanitized !== undefined) {
      payload['jsonParams'] = JSON.stringify(sanitized);
    }
  }

  return payload;
}
