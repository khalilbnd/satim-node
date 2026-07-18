import type { SatimCurrency, SatimLanguage, OrderStatus } from './enums';

/** Optional per-request overrides. */
export interface RequestOptions {
  /** Override timeout for this request (milliseconds). */
  timeout?: number;
  /**
   * Idempotency key for safe retries.
   * Concurrent identical keys share one in-flight request.
   * SATIM also enforces uniqueness on `orderNumber`.
   */
  idempotencyKey?: string;
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;
}

// ─── Register Order ───────────────────────────────────────────────────────────

export interface RegisterOrderParams {
  /** Unique order number in your system */
  orderNumber: string;
  /** Amount in Algerian centimes (1 DZD = 100 centimes) */
  amount: number;
  /** URL to redirect to on successful payment */
  returnUrl: string;
  /** URL to redirect to on failed payment */
  failUrl?: string;
  /** Order description shown to the payer */
  description?: string;
  /** Interface language. Defaults to FR */
  language?: SatimLanguage;
  /** Currency code. Defaults to DZD (012) */
  currency?: SatimCurrency;
  /** Additional parameters to attach (JSON-serialised). Sanitized against prototype pollution. */
  additionalParams?: Record<string, string>;
  /**
   * Optional idempotency key. Prevents duplicate concurrent registerOrder calls.
   * Defaults to `orderNumber` when omitted (client-side deduplication only).
   */
  idempotencyKey?: string;
}

export interface RegisterOrderResponse {
  /** SATIM-assigned order ID */
  orderId: string;
  /** Redirect URL — send the customer here to complete payment */
  formUrl: string;
}

// ─── Order Status ─────────────────────────────────────────────────────────────

export interface GetOrderStatusParams {
  /** SATIM-assigned order ID returned by registerOrder() */
  orderId: string;
  /** Interface language */
  language?: SatimLanguage;
}

export interface CardAuthInfo {
  maskedPan?: string;
  expiration?: string;
  cardholderName?: string;
  approvalCode?: string;
  authCode?: string;
}

export interface OrderStatusResponse {
  /** Numeric order state (see OrderStatus enum) */
  orderStatus: OrderStatus;
  /** Your original order number */
  orderNumber: string;
  /** Order description */
  orderDescription?: string;
  /** Amount in centimes */
  amount: number;
  /** Currency code */
  currency: string;
  /** ISO 8601 timestamp of the transaction */
  date?: string;
  /** SATIM error/response code */
  actionCode: number;
  /** Human-readable description of actionCode */
  actionCodeDescription?: string;
  /** Card info (only present after payment attempt) */
  cardAuthInfo?: CardAuthInfo;
  /** Raw response from SATIM */
  raw: Record<string, unknown>;
}

// ─── Confirm Order ────────────────────────────────────────────────────────────

export interface ConfirmOrderParams {
  /** SATIM-assigned order ID */
  orderId: string;
  /** Amount to capture in centimes. Must equal the original amount. */
  amount: number;
  /** Interface language */
  language?: SatimLanguage;
}

export interface ConfirmOrderResponse {
  /** SATIM error code (0 = success) */
  errorCode: number;
  /** Human-readable error message */
  errorMessage?: string;
  /** Whether the confirm was successful */
  success: boolean;
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export interface RefundOrderParams {
  /** SATIM-assigned order ID */
  orderId: string;
  /** Amount to refund in centimes */
  amount: number;
  /** Interface language */
  language?: SatimLanguage;
}

export interface RefundOrderResponse {
  /** SATIM error code (0 = success) */
  errorCode: number;
  /** Human-readable error message */
  errorMessage?: string;
  /** Whether the refund was successful */
  success: boolean;
}

// ─── Reverse (Void) ───────────────────────────────────────────────────────────

export interface ReverseOrderParams {
  /** SATIM-assigned order ID */
  orderId: string;
  /** Interface language */
  language?: SatimLanguage;
}

export interface ReverseOrderResponse {
  /** SATIM error code (0 = success) */
  errorCode: number;
  /** Human-readable error message */
  errorMessage?: string;
  /** Whether the reversal was successful */
  success: boolean;
}

// ─── Raw API response ─────────────────────────────────────────────────────────

export interface SatimRawResponse {
  errorCode?: string | number;
  errorMessage?: string;
  orderId?: string;
  formUrl?: string;
  orderStatus?: string | number;
  orderNumber?: string;
  amount?: string | number;
  currency?: string;
  depositAmount?: string | number;
  date?: string;
  actionCode?: string | number;
  actionCodeDescription?: string;
  cardAuthInfo?: Record<string, string>;
  attributes?: Array<{ name: string; value: string }>;
  [key: string]: unknown;
}
