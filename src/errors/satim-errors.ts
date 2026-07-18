import { SDKError } from './sdk-error';
import { SDKErrorCode } from './codes';
import type { OperationName } from '../constants/endpoints';

/**
 * Base error class for all SATIM SDK errors (backwards-compatible alias of SDKError).
 */
export class SatimError extends SDKError {
  constructor(
    message: string,
    options?: {
      code?: SDKErrorCode;
      status?: number;
      operation?: string;
      requestId?: string;
      cause?: unknown;
      apiErrorCode?: number;
      field?: string;
      raw?: Record<string, unknown>;
    }
  ) {
    const opts: ConstructorParameters<typeof SDKError>[0] = {
      code: options?.code ?? SDKErrorCode.UNKNOWN,
      message,
    };
    if (options?.status !== undefined) opts.status = options.status;
    if (options?.operation !== undefined) opts.operation = options.operation;
    if (options?.requestId !== undefined) opts.requestId = options.requestId;
    if (options?.cause !== undefined) opts.cause = options.cause;
    if (options?.apiErrorCode !== undefined) opts.apiErrorCode = options.apiErrorCode;
    if (options?.field !== undefined) opts.field = options.field;
    if (options?.raw !== undefined) opts.raw = options.raw;
    super(opts);
    this.name = 'SatimError';
  }
}

/**
 * Thrown when the SATIM API returns a non-zero error code.
 */
export class SatimApiError extends SatimError {
  /** @deprecated Prefer `apiErrorCode` — kept for backwards compatibility. */
  readonly errorCode: number;
  /** @deprecated Prefer `message` — kept for backwards compatibility. */
  readonly errorMessage: string;

  constructor(
    errorCode: number,
    errorMessage: string,
    raw?: Record<string, unknown>,
    operation?: OperationName | string
  ) {
    const code =
      errorCode === 5 || errorCode === 401 ? SDKErrorCode.UNAUTHORIZED : SDKErrorCode.API_ERROR;

    const opts: {
      code: SDKErrorCode;
      apiErrorCode: number;
      raw?: Record<string, unknown>;
      operation?: string;
    } = {
      code,
      apiErrorCode: errorCode,
    };
    if (raw !== undefined) opts.raw = raw;
    if (operation !== undefined) opts.operation = operation;

    super(`SATIM API error [${errorCode}]: ${errorMessage}`, opts);
    this.name = 'SatimApiError';
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
  }
}

/**
 * Thrown when a network or HTTP-level error occurs.
 */
export class SatimNetworkError extends SatimError {
  constructor(
    message: string,
    cause?: unknown,
    options?: { status?: number; operation?: string; requestId?: string; code?: SDKErrorCode }
  ) {
    const opts: {
      code: SDKErrorCode;
      cause?: unknown;
      status?: number;
      operation?: string;
      requestId?: string;
    } = {
      code: options?.code ?? SDKErrorCode.NETWORK_ERROR,
    };
    if (cause !== undefined) opts.cause = cause;
    if (options?.status !== undefined) opts.status = options.status;
    if (options?.operation !== undefined) opts.operation = options.operation;
    if (options?.requestId !== undefined) opts.requestId = options.requestId;
    super(message, opts);
    this.name = 'SatimNetworkError';
  }
}

/**
 * Thrown when required configuration is missing or invalid.
 */
export class SatimConfigError extends SatimError {
  constructor(message: string, code: SDKErrorCode = SDKErrorCode.INVALID_CONFIGURATION) {
    super(message, { code });
    this.name = 'SatimConfigError';
  }
}

/**
 * Thrown when input parameters fail validation.
 */
export class SatimValidationError extends SatimError {
  constructor(message: string, field?: string) {
    const opts: { code: SDKErrorCode; field?: string } = {
      code: SDKErrorCode.VALIDATION_ERROR,
    };
    if (field !== undefined) opts.field = field;
    super(message, opts);
    this.name = 'SatimValidationError';
  }
}
