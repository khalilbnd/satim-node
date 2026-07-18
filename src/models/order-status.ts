import type { SatimRawResponse, OrderStatusResponse, CardAuthInfo } from '../types';
import { OrderStatus, SatimCurrency } from '../types';
import { parseAmount, parseErrorCode, parseCardAuthInfo } from '../utils';

/**
 * Map a raw SATIM status payload into a typed OrderStatusResponse.
 */
export function mapOrderStatusResponse(raw: SatimRawResponse): OrderStatusResponse {
  const cardAuthInfo: CardAuthInfo | undefined = raw.cardAuthInfo
    ? parseCardAuthInfo(raw.cardAuthInfo as Record<string, string>)
    : undefined;

  const response: OrderStatusResponse = {
    orderStatus: Number(raw.orderStatus ?? OrderStatus.REGISTERED) as OrderStatus,
    orderNumber: String(raw.orderNumber ?? ''),
    amount: parseAmount(raw.amount),
    currency: String(raw.currency ?? SatimCurrency.DZD),
    actionCode: parseErrorCode(raw.actionCode),
    raw: raw as Record<string, unknown>,
  };

  if (raw.orderDescription !== undefined) {
    response.orderDescription = raw.orderDescription as string;
  }
  if (raw.date !== undefined) {
    response.date = raw.date;
  }
  if (raw.actionCodeDescription !== undefined) {
    response.actionCodeDescription = raw.actionCodeDescription;
  }
  if (cardAuthInfo !== undefined && Object.keys(cardAuthInfo).length > 0) {
    response.cardAuthInfo = cardAuthInfo;
  }

  return response;
}
