/**
 * Base error class for all SATIM SDK errors.
 */
export class SatimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SatimError';
    Object.setPrototypeOf(this, SatimError.prototype);
  }
}

/**
 * Thrown when the SATIM API returns a non-zero error code.
 */
export class SatimApiError extends SatimError {
  public readonly errorCode: number;
  public readonly errorMessage: string;
  public readonly raw?: Record<string, unknown>;

  constructor(errorCode: number, errorMessage: string, raw?: Record<string, unknown>) {
    super(`SATIM API error [${errorCode}]: ${errorMessage}`);
    this.name = 'SatimApiError';
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.raw = raw;
    Object.setPrototypeOf(this, SatimApiError.prototype);
  }
}

/**
 * Thrown when a network or HTTP-level error occurs.
 */
export class SatimNetworkError extends SatimError {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SatimNetworkError';
    this.cause = cause;
    Object.setPrototypeOf(this, SatimNetworkError.prototype);
  }
}

/**
 * Thrown when required configuration is missing or invalid.
 */
export class SatimConfigError extends SatimError {
  constructor(message: string) {
    super(message);
    this.name = 'SatimConfigError';
    Object.setPrototypeOf(this, SatimConfigError.prototype);
  }
}

/**
 * Thrown when input parameters fail validation.
 */
export class SatimValidationError extends SatimError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'SatimValidationError';
    this.field = field;
    Object.setPrototypeOf(this, SatimValidationError.prototype);
  }
}
