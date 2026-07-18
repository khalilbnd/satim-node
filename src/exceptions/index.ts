/**
 * Backwards-compatible re-export path for `satim-node-sdk/exceptions` consumers.
 * Prefer importing from `satim-node-sdk` directly.
 */
export {
  SatimError,
  SatimApiError,
  SatimNetworkError,
  SatimConfigError,
  SatimValidationError,
  SDKError,
  SDKErrorCode,
} from '../errors';
