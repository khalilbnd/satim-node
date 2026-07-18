/**
 * Optional logger injected by the consumer.
 * The SDK never logs unless this is provided.
 * Implementations must never receive payloads, credentials, or tokens from the SDK.
 */
export interface SatimLogger {
  debug?(message: string, meta?: Record<string, unknown>): void;
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Per-operation timeout overrides (milliseconds).
 */
export interface OperationTimeouts {
  registerOrder?: number;
  confirmOrder?: number;
  refund?: number;
  status?: number;
  reverse?: number;
  token?: number;
}

/**
 * Retry policy — retries are disabled unless explicitly configured.
 */
export interface RetryConfig {
  /** Maximum retry attempts after the initial request. Defaults to 0 (no retries). */
  maxRetries?: number;
  /** Base delay in ms between retries (exponential backoff). Defaults to 200. */
  baseDelayMs?: number;
  /** Retry only on network/timeout errors (never on 4xx business failures). Defaults to true. */
  retryOnNetworkError?: boolean;
}

/**
 * Client configuration for the SATIM SDK.
 */
export interface SatimConfig {
  /** Merchant username provided by SATIM */
  username: string;
  /** Merchant password provided by SATIM */
  password: string;
  /** Terminal ID provided by SATIM */
  terminalId: string;
  /** Use sandbox/test environment. Defaults to false (production). */
  sandbox?: boolean;
  /**
   * Global default request timeout in milliseconds.
   * Overridden by `timeouts` and per-request options.
   * Defaults to 30000.
   */
  timeout?: number;
  /** Per-operation timeout overrides (milliseconds). */
  timeouts?: OperationTimeouts;
  /** Optional custom base URL for the SATIM API. Overrides sandbox/production defaults. */
  baseUrl?: string;
  /**
   * Whether to verify SSL certificates. Defaults to true.
   * Setting this to `false` is deprecated and ignored — TLS certificate
   * verification cannot be disabled. Use a proper CA bundle instead.
   * @deprecated SSL verification bypass is no longer supported for security reasons.
   */
  verifySsl?: boolean;
  /**
   * Allow `http://` base URLs for local mock servers only.
   * Defaults to false. Production and default SATIM endpoints always require HTTPS.
   */
  allowInsecureHttp?: boolean;
  /**
   * @deprecated Use `logger` instead. When true without a logger, has no effect
   * (the SDK never writes to console).
   */
  debug?: boolean;
  /**
   * Optional logger. Only safe metadata (endpoint, status, duration, requestId)
   * is ever passed — never payloads, credentials, or tokens.
   */
  logger?: SatimLogger;
  /** Optional retry policy. Retries are off by default. */
  retries?: RetryConfig;
}
