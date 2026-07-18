import { DEFAULT_TIMEOUT_MS, DEFAULT_MAX_RETRIES } from '../constants/defaults';
import { Endpoints } from '../constants/endpoints';
import { SatimHttpClient } from '../http/client';
import { SatimApiError, SatimConfigError } from '../errors/satim-errors';
import { mapOrderStatusResponse } from '../models/order-status';
import { IdempotencyGuard, resolveAndValidateBaseUrl } from '../security';
import { buildRegisterPayload } from '../services/orders';
import { SatimLanguage, OrderStatus } from '../types/enums';
import type {
  SatimConfig,
  RegisterOrderParams,
  RegisterOrderResponse,
  GetOrderStatusParams,
  OrderStatusResponse,
  ConfirmOrderParams,
  ConfirmOrderResponse,
  RefundOrderParams,
  RefundOrderResponse,
  ReverseOrderParams,
  ReverseOrderResponse,
  SatimRawResponse,
  RequestOptions,
} from '../types';
import {
  parseErrorCode,
  isSuccessResponse,
  requireString,
  validateUrl,
  validateAmount,
} from '../utils';

/**
 * Resolved internal configuration after defaults are applied.
 */
interface ResolvedConfig {
  username: string;
  password: string;
  terminalId: string;
  sandbox: boolean;
  timeout: number;
  baseUrl: string;
  allowInsecureHttp: boolean;
  timeouts: NonNullable<SatimConfig['timeouts']>;
  retries: {
    maxRetries: number;
    baseDelayMs: number;
    retryOnNetworkError: boolean;
  };
  logger?: SatimConfig['logger'];
}

/**
 * SATIM Payment Gateway client.
 *
 * @example
 * ```ts
 * const satim = new Satim({
 *   username:   'your-username',
 *   password:   'your-password',
 *   terminalId: 'your-terminal-id',
 *   sandbox:    true,
 * });
 *
 * const { orderId, formUrl } = await satim.registerOrder({
 *   orderNumber: 'ORDER-001',
 *   amount:      500000,
 *   returnUrl:   'https://my-app.dz/payment/success',
 *   failUrl:     'https://my-app.dz/payment/fail',
 *   description: 'My first order',
 * });
 * ```
 */
export class Satim {
  private readonly client: SatimHttpClient;
  private readonly idempotency: IdempotencyGuard;

  constructor(config: SatimConfig) {
    const resolved = this.resolveConfig(config);
    this.idempotency = new IdempotencyGuard();

    const httpOptions: ConstructorParameters<typeof SatimHttpClient>[0] = {
      baseUrl: resolved.baseUrl,
      credentials: {
        username: resolved.username,
        password: resolved.password,
        terminalId: resolved.terminalId,
      },
      defaultTimeout: resolved.timeout,
      timeouts: resolved.timeouts,
      retries: resolved.retries,
    };
    if (resolved.logger !== undefined) {
      httpOptions.logger = resolved.logger;
    }

    this.client = new SatimHttpClient(httpOptions);
  }

  /**
   * Register a new order with SATIM and obtain a payment URL.
   *
   * ### Idempotency
   * SATIM rejects duplicate `orderNumber` values server-side. This SDK additionally
   * deduplicates **concurrent** `registerOrder` calls that share the same
   * `idempotencyKey` (or `orderNumber` when no key is provided), so retries and
   * double-submits do not create parallel in-flight registrations.
   *
   * Completed requests are not cached — call again with a new `orderNumber` for
   * a new payment. Re-using the same `orderNumber` after success will return a
   * SATIM API error (duplicate order).
   *
   * @throws {SatimValidationError} When input params are invalid
   * @throws {SatimApiError}        When SATIM returns a non-zero error code
   * @throws {SatimNetworkError}    On HTTP/network failures
   */
  async registerOrder(
    params: RegisterOrderParams,
    options?: RequestOptions
  ): Promise<RegisterOrderResponse> {
    requireString(params.orderNumber, 'orderNumber');
    validateAmount(params.amount, 'amount');
    validateUrl(params.returnUrl, 'returnUrl');
    if (params.failUrl) validateUrl(params.failUrl, 'failUrl');

    const idempotencyKey = options?.idempotencyKey ?? params.idempotencyKey ?? params.orderNumber;

    return this.idempotency.run(idempotencyKey, async () => {
      const payload = buildRegisterPayload(params);

      const requestOpts: Parameters<SatimHttpClient['post']>[2] = {
        operation: 'registerOrder',
      };
      if (options?.timeout !== undefined) requestOpts.timeout = options.timeout;
      if (options?.signal !== undefined) requestOpts.signal = options.signal;

      const raw = await this.client.post<SatimRawResponse>(
        Endpoints.REGISTER,
        payload,
        requestOpts
      );

      if (!isSuccessResponse(raw)) {
        throw new SatimApiError(
          parseErrorCode(raw.errorCode),
          raw.errorMessage ?? 'Unknown error',
          raw as Record<string, unknown>,
          'registerOrder'
        );
      }

      if (!raw.orderId || !raw.formUrl) {
        throw new SatimApiError(
          -1,
          'SATIM did not return orderId or formUrl',
          undefined,
          'registerOrder'
        );
      }

      return {
        orderId: raw.orderId,
        formUrl: raw.formUrl,
      };
    });
  }

  /**
   * Retrieve the current status of an order.
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async getOrderStatus(
    params: GetOrderStatusParams,
    options?: RequestOptions
  ): Promise<OrderStatusResponse> {
    requireString(params.orderId, 'orderId');

    const requestOpts: Parameters<SatimHttpClient['post']>[2] = {
      operation: 'status',
    };
    if (options?.timeout !== undefined) requestOpts.timeout = options.timeout;
    if (options?.signal !== undefined) requestOpts.signal = options.signal;

    const raw = await this.client.post<SatimRawResponse>(
      Endpoints.STATUS,
      {
        orderId: params.orderId,
        language: params.language ?? SatimLanguage.FR,
      },
      requestOpts
    );

    if (!isSuccessResponse(raw)) {
      throw new SatimApiError(
        parseErrorCode(raw.errorCode),
        raw.errorMessage ?? 'Unknown error',
        raw as Record<string, unknown>,
        'status'
      );
    }

    return mapOrderStatusResponse(raw);
  }

  /**
   * Confirm (capture) a pre-authorised order.
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async confirmOrder(
    params: ConfirmOrderParams,
    options?: RequestOptions
  ): Promise<ConfirmOrderResponse> {
    requireString(params.orderId, 'orderId');
    validateAmount(params.amount, 'amount');

    const requestOpts: Parameters<SatimHttpClient['post']>[2] = {
      operation: 'confirmOrder',
    };
    if (options?.timeout !== undefined) requestOpts.timeout = options.timeout;
    if (options?.signal !== undefined) requestOpts.signal = options.signal;

    const raw = await this.client.post<SatimRawResponse>(
      Endpoints.CONFIRM,
      {
        orderId: params.orderId,
        amount: params.amount,
        language: params.language ?? SatimLanguage.FR,
      },
      requestOpts
    );

    const errorCode = parseErrorCode(raw.errorCode);
    const result: ConfirmOrderResponse = {
      errorCode,
      success: errorCode === 0,
    };
    if (raw.errorMessage !== undefined) result.errorMessage = raw.errorMessage;
    return result;
  }

  /**
   * Refund a captured order (partial or full).
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async refundOrder(
    params: RefundOrderParams,
    options?: RequestOptions
  ): Promise<RefundOrderResponse> {
    requireString(params.orderId, 'orderId');
    validateAmount(params.amount, 'amount');

    const requestOpts: Parameters<SatimHttpClient['post']>[2] = {
      operation: 'refund',
    };
    if (options?.timeout !== undefined) requestOpts.timeout = options.timeout;
    if (options?.signal !== undefined) requestOpts.signal = options.signal;

    const raw = await this.client.post<SatimRawResponse>(
      Endpoints.REFUND,
      {
        orderId: params.orderId,
        amount: params.amount,
        language: params.language ?? SatimLanguage.FR,
      },
      requestOpts
    );

    const errorCode = parseErrorCode(raw.errorCode);
    const result: RefundOrderResponse = {
      errorCode,
      success: errorCode === 0,
    };
    if (raw.errorMessage !== undefined) result.errorMessage = raw.errorMessage;
    return result;
  }

  /**
   * Reverse (void) an order before capture.
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async reverseOrder(
    params: ReverseOrderParams,
    options?: RequestOptions
  ): Promise<ReverseOrderResponse> {
    requireString(params.orderId, 'orderId');

    const requestOpts: Parameters<SatimHttpClient['post']>[2] = {
      operation: 'reverse',
    };
    if (options?.timeout !== undefined) requestOpts.timeout = options.timeout;
    if (options?.signal !== undefined) requestOpts.signal = options.signal;

    const raw = await this.client.post<SatimRawResponse>(
      Endpoints.REVERSE,
      {
        orderId: params.orderId,
        language: params.language ?? SatimLanguage.FR,
      },
      requestOpts
    );

    const errorCode = parseErrorCode(raw.errorCode);
    const result: ReverseOrderResponse = {
      errorCode,
      success: errorCode === 0,
    };
    if (raw.errorMessage !== undefined) result.errorMessage = raw.errorMessage;
    return result;
  }

  /**
   * Check whether a payment was successful by verifying the order status
   * returned from getOrderStatus().
   */
  isPaymentSuccessful(status: OrderStatusResponse): boolean {
    return (
      status.orderStatus === OrderStatus.AUTHORIZED ||
      status.orderStatus === OrderStatus.PRE_AUTHORIZED
    );
  }

  private resolveConfig(config: SatimConfig): ResolvedConfig {
    if (!config.username || config.username.trim() === '') {
      throw new SatimConfigError('"username" is required in SatimConfig');
    }
    if (!config.password || config.password.trim() === '') {
      throw new SatimConfigError('"password" is required in SatimConfig');
    }
    if (!config.terminalId || config.terminalId.trim() === '') {
      throw new SatimConfigError('"terminalId" is required in SatimConfig');
    }
    if (
      config.timeout !== undefined &&
      (config.timeout <= 0 || !Number.isInteger(config.timeout))
    ) {
      throw new SatimConfigError('"timeout" must be a positive integer (milliseconds)');
    }

    this.validateOperationTimeouts(config.timeouts);

    const allowInsecureHttp = config.allowInsecureHttp === true;
    const baseUrlOptions: Parameters<typeof resolveAndValidateBaseUrl>[0] = {
      sandbox: config.sandbox ?? false,
      allowInsecureHttp,
    };
    if (config.baseUrl !== undefined) {
      baseUrlOptions.baseUrl = config.baseUrl;
    }
    const baseUrl = resolveAndValidateBaseUrl(baseUrlOptions);

    if (config.verifySsl === false) {
      config.logger?.warn?.(
        'verifySsl: false is deprecated and ignored. TLS certificate verification cannot be disabled.'
      );
    }

    return {
      username: config.username,
      password: config.password,
      terminalId: config.terminalId,
      sandbox: config.sandbox ?? false,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      baseUrl,
      allowInsecureHttp,
      timeouts: config.timeouts ?? {},
      retries: {
        maxRetries: config.retries?.maxRetries ?? DEFAULT_MAX_RETRIES,
        baseDelayMs: config.retries?.baseDelayMs ?? 200,
        retryOnNetworkError: config.retries?.retryOnNetworkError ?? true,
      },
      ...(config.logger !== undefined ? { logger: config.logger } : {}),
    };
  }

  private validateOperationTimeouts(timeouts: SatimConfig['timeouts']): void {
    if (!timeouts) return;
    for (const [key, value] of Object.entries(timeouts)) {
      if (value !== undefined && (value <= 0 || !Number.isInteger(value))) {
        throw new SatimConfigError(`"timeouts.${key}" must be a positive integer (milliseconds)`);
      }
    }
  }
}
