import { SatimConfigError } from '../errors/satim-errors';
import { SDKErrorCode } from '../errors/codes';
import { PRODUCTION_BASE_URL, SANDBOX_BASE_URL } from '../constants/defaults';

export interface ResolveBaseUrlOptions {
  sandbox?: boolean;
  baseUrl?: string;
  allowInsecureHttp?: boolean;
}

/**
 * Resolve and validate the API base URL.
 *
 * - HTTPS is required unless `allowInsecureHttp` is explicitly true.
 * - Empty/custom base URLs fall back to sandbox or production defaults.
 */
export function resolveAndValidateBaseUrl(options: ResolveBaseUrlOptions): string {
  const allowInsecure = options.allowInsecureHttp === true;
  const raw =
    options.baseUrl && options.baseUrl.trim() !== ''
      ? options.baseUrl.trim().replace(/\/$/, '')
      : options.sandbox
        ? SANDBOX_BASE_URL
        : PRODUCTION_BASE_URL;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SatimConfigError(`Invalid baseUrl: "${raw}"`);
  }

  if (parsed.protocol === 'https:') {
    return raw;
  }

  if (parsed.protocol === 'http:') {
    if (!allowInsecure) {
      throw new SatimConfigError(
        `HTTPS is required for SATIM API URLs. Received: "${raw}". ` +
          `Set allowInsecureHttp: true only for local development/testing.`,
        SDKErrorCode.SSL_REQUIRED
      );
    }
    return raw;
  }

  throw new SatimConfigError(
    `Unsupported URL protocol "${parsed.protocol}" in baseUrl. Only https: (or http: with allowInsecureHttp) is allowed.`,
    SDKErrorCode.SSL_REQUIRED
  );
}

/**
 * Validate that a redirect/callback URL is well-formed.
 * Does not enforce HTTPS on merchant return URLs (merchant choice).
 */
export function assertValidUrl(value: string, name: string): void {
  try {
    new URL(value);
  } catch {
    throw new SatimConfigError(`"${name}" must be a valid URL, got: "${value}"`);
  }
}
