import { SDKErrorCode } from './codes';
import type { OperationName } from '../constants/endpoints';

export interface SDKErrorOptions {
  code: SDKErrorCode;
  message: string;
  status?: number;
  operation?: OperationName | string;
  requestId?: string;
  cause?: unknown;
  /** SATIM business error code when applicable. */
  apiErrorCode?: number;
  /** Field name for validation errors. */
  field?: string;
  /** Raw SATIM response payload (never credentials). */
  raw?: Record<string, unknown>;
}

/**
 * Structured base error for all SDK failures.
 *
 * Prefer inspecting `code` over parsing `message`.
 */
export class SDKError extends Error {
  readonly code: SDKErrorCode;
  readonly status?: number;
  readonly operation?: string;
  readonly requestId?: string;
  override readonly cause?: unknown;
  readonly apiErrorCode?: number;
  readonly field?: string;
  readonly raw?: Record<string, unknown>;

  constructor(options: SDKErrorOptions) {
    super(options.message);
    this.name = 'SDKError';
    this.code = options.code;
    if (options.status !== undefined) this.status = options.status;
    if (options.operation !== undefined) this.operation = options.operation;
    if (options.requestId !== undefined) this.requestId = options.requestId;
    if (options.cause !== undefined) this.cause = options.cause;
    if (options.apiErrorCode !== undefined) this.apiErrorCode = options.apiErrorCode;
    if (options.field !== undefined) this.field = options.field;
    if (options.raw !== undefined) this.raw = options.raw;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      operation: this.operation,
      requestId: this.requestId,
      apiErrorCode: this.apiErrorCode,
      field: this.field,
    };
  }
}
