import type { OperationName } from '../constants/endpoints';
import type { OperationTimeouts, RetryConfig, SatimLogger } from '../types/config';

export interface HttpCredentials {
  username: string;
  password: string;
  terminalId: string;
}

export interface HttpClientOptions {
  baseUrl: string;
  credentials: HttpCredentials;
  /** Global default timeout in ms. */
  defaultTimeout: number;
  timeouts: OperationTimeouts;
  retries: Required<RetryConfig>;
  logger?: SatimLogger;
}

export interface HttpRequestOptions {
  timeout?: number;
  signal?: AbortSignal;
  operation?: OperationName;
  /** Optional request id for correlation in logger metadata. */
  requestId?: string;
}

export interface HttpResponseMeta {
  endpoint: string;
  status: number;
  durationMs: number;
  requestId?: string;
  operation?: string;
}
