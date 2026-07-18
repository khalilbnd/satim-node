/** Default SATIM production REST base URL. */
export const PRODUCTION_BASE_URL = 'https://satim.dz/payment/rest';

/** Default SATIM sandbox/test REST base URL. */
export const SANDBOX_BASE_URL = 'https://test.satim.dz/payment/rest';

/** Default request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum number of retries when retries are explicitly enabled. */
export const DEFAULT_MAX_RETRIES = 0;

/** Dangerous object keys rejected during sanitization. */
export const DANGEROUS_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'] as const);
