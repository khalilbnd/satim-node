// ─── Configuration ────────────────────────────────────────────────────────────

export interface SatimConfig {
  /** Merchant username provided by SATIM */
  username: string;
  /** Merchant password provided by SATIM */
  password: string;
  /** Terminal ID provided by SATIM */
  terminalId: string;
  /** Use sandbox/test environment. Defaults to false (production). */
  sandbox?: boolean;
  /** Request timeout in milliseconds. Defaults to 30000 */
  timeout?: number;
  /** Optional custom base URL for the SATIM API. Overrides sandbox/production defaults. */
  baseUrl?: string;
  /** Whether to verify SSL certificates. Defaults to true. Useful for local testing or broken sandbox environments. */
  verifySsl?: boolean;
  /** Enable verbose debug logging of all API requests and responses. */
  debug?: boolean;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum SatimCurrency {
  DZD = '012',
}

export enum SatimLanguage {
  AR = 'AR',
  FR = 'FR',
  EN = 'EN',
}

export enum OrderStatus {
  /** Order registered but not paid */
  REGISTERED = 0,
  /** Pre-authorized amount held */
  PRE_AUTHORIZED = 1,
  /** Full authorization complete */
  AUTHORIZED = 2,
  /** Authorization cancelled */
  CANCELLED = 3,
  /** Transaction reversed */
  REVERSED = 4,
  /** Transaction initiated but not confirmed by the bank */
  INITIATED = 5,
  /** Transaction declined */
  DECLINED = 6,
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
  /** Additional parameters to attach (JSON-serialised) */
  additionalParams?: Record<string, string>;
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
