/**
 * satim-node-sdk — public API barrel.
 *
 * Implementation lives under dedicated modules; this file only re-exports
 * the supported surface for consumers.
 */

export { Satim } from './client';

export type {
  SatimConfig,
  SatimLogger,
  OperationTimeouts,
  RetryConfig,
  RequestOptions,
  RegisterOrderParams,
  RegisterOrderResponse,
  GetOrderStatusParams,
  OrderStatusResponse,
  ConfirmOrderParams,
  ConfirmOrderResponse,
  RefundOrderParams,
  RefundOrderResponse,
  ReverseOrderParams,
  ReverseOrderResponse,
  CardAuthInfo,
  SatimRawResponse,
} from './types';

export { SatimCurrency, SatimLanguage, OrderStatus } from './types';

export {
  SDKError,
  SDKErrorCode,
  SatimError,
  SatimApiError,
  SatimNetworkError,
  SatimConfigError,
  SatimValidationError,
} from './errors';

export type { SDKErrorOptions } from './errors';

export { centimesToDZD, DZDToCentimes, getLocalizedMessage } from './utils';

/** @internal Re-exported for advanced consumers / tests — prefer public helpers above. */
export { sanitizeObject, sanitizeStringRecord } from './security';
