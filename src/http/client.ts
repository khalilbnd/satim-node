import { SatimNetworkError } from '../errors/satim-errors';
import { SDKErrorCode } from '../errors/codes';
import type { OperationName } from '../constants/endpoints';
import type { SatimRawResponse } from '../types';
import { encodeFormBody, sleep, createRequestId } from './helpers';
import type { HttpClientOptions, HttpRequestOptions } from './types';

type NetworkErrorOpts = {
  status?: number;
  operation?: string;
  requestId?: string;
  code?: SDKErrorCode;
};

function networkOpts(partial: {
  status?: number | undefined;
  operation?: OperationName | undefined;
  requestId?: string | undefined;
  code?: SDKErrorCode | undefined;
}): NetworkErrorOpts {
  const opts: NetworkErrorOpts = {};
  if (partial.status !== undefined) opts.status = partial.status;
  if (partial.operation !== undefined) opts.operation = partial.operation;
  if (partial.requestId !== undefined) opts.requestId = partial.requestId;
  if (partial.code !== undefined) opts.code = partial.code;
  return opts;
}

/**
 * Lightweight HTTP client for the SATIM REST API using the native Fetch API.
 *
 * - Timeouts via AbortController
 * - Optional retries only when configured
 * - Never logs payloads, credentials, or tokens
 */
export class SatimHttpClient {
  private readonly baseUrl: string;
  private readonly credentials: HttpClientOptions['credentials'];
  private readonly defaultTimeout: number;
  private readonly timeouts: HttpClientOptions['timeouts'];
  private readonly retries: HttpClientOptions['retries'];
  private readonly logger: HttpClientOptions['logger'];
  private readonly fetchImpl: typeof fetch;

  constructor(
    options: HttpClientOptions,
    fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)
  ) {
    this.baseUrl = options.baseUrl;
    this.credentials = options.credentials;
    this.defaultTimeout = options.defaultTimeout;
    this.timeouts = options.timeouts;
    this.retries = options.retries;
    this.logger = options.logger;
    this.fetchImpl = fetchImpl;
  }

  /** Resolve timeout for an operation (request override > operation > global). */
  resolveTimeout(operation: OperationName | undefined, requestTimeout?: number): number {
    if (requestTimeout !== undefined) return requestTimeout;
    if (operation !== undefined) {
      const opTimeout = this.timeouts[operation];
      if (opTimeout !== undefined) return opTimeout;
    }
    return this.defaultTimeout;
  }

  /**
   * POST form-urlencoded data to a SATIM endpoint.
   * Credentials are injected internally and never exposed to loggers.
   */
  async post<T = SatimRawResponse>(
    endpoint: string,
    params: Record<string, unknown>,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    const requestId = options.requestId ?? createRequestId();
    const operation = options.operation;
    const timeoutMs = this.resolveTimeout(operation, options.timeout);
    const maxRetries = this.retries.maxRetries;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        return await this.executeOnce<T>(endpoint, params, {
          ...options,
          requestId,
          timeout: timeoutMs,
        });
      } catch (err) {
        lastError = err;
        const shouldRetry =
          maxRetries > 0 &&
          attempt < maxRetries &&
          this.retries.retryOnNetworkError &&
          this.isRetryable(err);

        if (!shouldRetry) throw err;

        const delay = this.retries.baseDelayMs * Math.pow(2, attempt);
        this.logger?.warn?.('Retrying SATIM request', {
          endpoint,
          attempt: attempt + 1,
          delayMs: delay,
          requestId,
          ...(operation !== undefined ? { operation } : {}),
        });
        await sleep(delay);
        attempt += 1;
      }
    }

    throw lastError;
  }

  private async executeOnce<T>(
    endpoint: string,
    params: Record<string, unknown>,
    options: HttpRequestOptions & { timeout: number; requestId: string }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const body = encodeFormBody({
      userName: this.credentials.username,
      password: this.credentials.password,
      terminalId: this.credentials.terminalId,
      ...params,
    });

    const controller = new AbortController();
    const signals: AbortSignal[] = [controller.signal];
    if (options.signal) signals.push(options.signal);

    const composite = AbortSignal.any
      ? AbortSignal.any(signals)
      : this.mergeSignals(signals, controller);

    const timer = setTimeout(() => {
      controller.abort();
    }, options.timeout);

    const started = Date.now();

    this.logger?.debug?.('SATIM request started', {
      endpoint,
      requestId: options.requestId,
      ...(options.operation !== undefined ? { operation: options.operation } : {}),
    });

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
        signal: composite,
      });

      const durationMs = Date.now() - started;
      const meta: Record<string, unknown> = {
        endpoint,
        status: response.status,
        durationMs,
        requestId: options.requestId,
      };
      if (options.operation !== undefined) {
        meta['operation'] = options.operation;
      }

      if (response.status === 401 || response.status === 403) {
        this.logger?.error?.('SATIM unauthorized', meta);
        throw new SatimNetworkError(
          `SATIM HTTP ${response.status}: unauthorized`,
          undefined,
          networkOpts({
            status: response.status,
            operation: options.operation,
            requestId: options.requestId,
            code: SDKErrorCode.UNAUTHORIZED,
          })
        );
      }

      if (response.status === 429) {
        this.logger?.warn?.('SATIM rate limited', meta);
        throw new SatimNetworkError(
          `SATIM HTTP 429: rate limited`,
          undefined,
          networkOpts({
            status: 429,
            operation: options.operation,
            requestId: options.requestId,
            code: SDKErrorCode.RATE_LIMIT,
          })
        );
      }

      if (!response.ok) {
        this.logger?.error?.('SATIM HTTP error', meta);
        throw new SatimNetworkError(
          `SATIM HTTP ${response.status}: ${response.statusText}`,
          undefined,
          networkOpts({
            status: response.status,
            operation: options.operation,
            requestId: options.requestId,
          })
        );
      }

      let data: T;
      try {
        data = (await response.json()) as T;
      } catch (parseErr) {
        this.logger?.error?.('SATIM invalid JSON response', meta);
        throw new SatimNetworkError(
          'SATIM returned a malformed JSON response',
          parseErr,
          networkOpts({
            status: response.status,
            operation: options.operation,
            requestId: options.requestId,
            code: SDKErrorCode.INVALID_RESPONSE,
          })
        );
      }

      this.logger?.info?.('SATIM request completed', meta);
      return data;
    } catch (err) {
      if (err instanceof SatimNetworkError) throw err;

      const durationMs = Date.now() - started;
      const aborted =
        (err instanceof Error && err.name === 'AbortError') ||
        (typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name: string }).name === 'AbortError');

      if (aborted) {
        this.logger?.warn?.('SATIM request timed out', {
          endpoint,
          durationMs,
          requestId: options.requestId,
          ...(options.operation !== undefined ? { operation: options.operation } : {}),
        });
        throw new SatimNetworkError(
          `SATIM request timed out after ${options.timeout}ms`,
          err,
          networkOpts({
            operation: options.operation,
            requestId: options.requestId,
            code: SDKErrorCode.TIMEOUT,
          })
        );
      }

      this.logger?.error?.('SATIM network error', {
        endpoint,
        durationMs,
        requestId: options.requestId,
        ...(options.operation !== undefined ? { operation: options.operation } : {}),
      });

      throw new SatimNetworkError(
        `Unexpected network error: ${err instanceof Error ? err.message : String(err)}`,
        err,
        networkOpts({
          operation: options.operation,
          requestId: options.requestId,
          code: SDKErrorCode.NETWORK_ERROR,
        })
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private isRetryable(err: unknown): boolean {
    if (!(err instanceof SatimNetworkError)) return false;
    if (err.status !== undefined && err.status >= 400 && err.status < 500) {
      // Do not retry client errors (except rate limit, handled below).
      return err.code === SDKErrorCode.RATE_LIMIT;
    }
    return (
      err.code === SDKErrorCode.NETWORK_ERROR ||
      err.code === SDKErrorCode.TIMEOUT ||
      err.code === SDKErrorCode.RATE_LIMIT ||
      (err.status !== undefined && err.status >= 500)
    );
  }

  /** Fallback AbortSignal merge for runtimes without AbortSignal.any. */
  private mergeSignals(signals: AbortSignal[], controller: AbortController): AbortSignal {
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    return controller.signal;
  }
}
