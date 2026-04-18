import { SatimHttpClient } from './http-client';
import {
  SatimConfig,
  SatimLanguage,
  SatimCurrency,
  OrderStatus,
  SatimRawResponse,
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
} from './types';
import {
  SatimApiError,
  SatimConfigError,
  SatimValidationError,
} from './exceptions';
import {
  parseErrorCode,
  parseAmount,
  parseCardAuthInfo,
  isSuccessResponse,
  requireString,
  validateUrl,
  validateAmount,
} from './utils';

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
 *   amount:      500000,          // 5 000.00 DZD in centimes
 *   returnUrl:   'https://my-app.dz/payment/success',
 *   failUrl:     'https://my-app.dz/payment/fail',
 *   description: 'My first order',
 * });
 *
 * // Redirect the customer to formUrl
 * ```
 */
export class Satim {
  private readonly client: SatimHttpClient;

  constructor(config: SatimConfig) {
    this.validateConfig(config);

    const resolved: Required<SatimConfig> = {
      username:   config.username,
      password:   config.password,
      terminalId: config.terminalId,
      sandbox:    config.sandbox   ?? false,
      timeout:    config.timeout   ?? 30_000,
      baseUrl:    config.baseUrl   ?? '',
      verifySsl:  config.verifySsl ?? true,
      debug:      config.debug     ?? false,
    };

    this.client = new SatimHttpClient(resolved);
  }

  // ─── Register Order ────────────────────────────────────────────────────────

  /**
   * Register a new order with SATIM and obtain a payment URL.
   *
   * The customer must be redirected to `formUrl` to enter their card details.
   * After payment SATIM will redirect back to `returnUrl` or `failUrl`.
   *
   * @throws {SatimValidationError} When input params are invalid
   * @throws {SatimApiError}        When SATIM returns a non-zero error code
   * @throws {SatimNetworkError}    On HTTP/network failures
   */
  async registerOrder(params: RegisterOrderParams): Promise<RegisterOrderResponse> {
    // Validate
    requireString(params.orderNumber, 'orderNumber');
    validateAmount(params.amount, 'amount');
    validateUrl(params.returnUrl, 'returnUrl');
    if (params.failUrl) validateUrl(params.failUrl, 'failUrl');

    const payload: Record<string, unknown> = {
      orderNumber: params.orderNumber,
      amount:      params.amount,
      returnUrl:   params.returnUrl,
      failUrl:     params.failUrl ?? params.returnUrl,
      currency:    params.currency  ?? SatimCurrency.DZD,
      language:    params.language  ?? SatimLanguage.FR,
    };

    if (params.description)      payload.description = params.description;
    if (params.additionalParams) payload.jsonParams  = JSON.stringify(params.additionalParams);

    const raw = await this.client.post<SatimRawResponse>('/register.do', payload);

    if (!isSuccessResponse(raw)) {
      throw new SatimApiError(
        parseErrorCode(raw.errorCode),
        raw.errorMessage ?? 'Unknown error',
        raw as Record<string, unknown>
      );
    }

    if (!raw.orderId || !raw.formUrl) {
      throw new SatimApiError(-1, 'SATIM did not return orderId or formUrl');
    }

    return {
      orderId: raw.orderId,
      formUrl: raw.formUrl,
    };
  }

  // ─── Get Order Status ──────────────────────────────────────────────────────

  /**
   * Retrieve the current status of an order.
   *
   * Call this from your `returnUrl` handler to verify payment success.
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async getOrderStatus(params: GetOrderStatusParams): Promise<OrderStatusResponse> {
    requireString(params.orderId, 'orderId');

    const raw = await this.client.post<SatimRawResponse>('/getOrderStatusExtended.do', {
      orderId:  params.orderId,
      language: params.language ?? SatimLanguage.FR,
    });

    if (!isSuccessResponse(raw)) {
      throw new SatimApiError(
        parseErrorCode(raw.errorCode),
        raw.errorMessage ?? 'Unknown error',
        raw as Record<string, unknown>
      );
    }

    return {
      orderStatus:         Number(raw.orderStatus ?? OrderStatus.REGISTERED) as OrderStatus,
      orderNumber:         String(raw.orderNumber ?? ''),
      orderDescription:    raw.orderDescription as string | undefined,
      amount:              parseAmount(raw.amount),
      currency:            String(raw.currency ?? SatimCurrency.DZD),
      date:                raw.date as string | undefined,
      actionCode:          parseErrorCode(raw.actionCode),
      actionCodeDescription: raw.actionCodeDescription as string | undefined,
      cardAuthInfo:        parseCardAuthInfo(raw.cardAuthInfo as Record<string, string>),
      raw:                 raw as Record<string, unknown>,
    };
  }

  // ─── Confirm Order ─────────────────────────────────────────────────────────

  /**
   * Confirm (capture) a pre-authorised order.
   *
   * Required when the merchant terminal is configured for two-step payment.
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async confirmOrder(params: ConfirmOrderParams): Promise<ConfirmOrderResponse> {
    requireString(params.orderId, 'orderId');
    validateAmount(params.amount, 'amount');

    const raw = await this.client.post<SatimRawResponse>('/confirmOrder.do', {
      orderId:  params.orderId,
      amount:   params.amount,
      language: params.language ?? SatimLanguage.FR,
    });

    const errorCode = parseErrorCode(raw.errorCode);

    return {
      errorCode,
      errorMessage: raw.errorMessage,
      success:      errorCode === 0,
    };
  }

  // ─── Refund ────────────────────────────────────────────────────────────────

  /**
   * Refund a captured order (partial or full).
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async refundOrder(params: RefundOrderParams): Promise<RefundOrderResponse> {
    requireString(params.orderId, 'orderId');
    validateAmount(params.amount, 'amount');

    const raw = await this.client.post<SatimRawResponse>('/refund.do', {
      orderId:  params.orderId,
      amount:   params.amount,
      language: params.language ?? SatimLanguage.FR,
    });

    const errorCode = parseErrorCode(raw.errorCode);

    return {
      errorCode,
      errorMessage: raw.errorMessage,
      success:      errorCode === 0,
    };
  }

  // ─── Reverse (Void) ────────────────────────────────────────────────────────

  /**
   * Reverse (void) an order before capture.
   *
   * Use this to cancel a payment that has been authorised but not yet captured.
   *
   * @throws {SatimApiError}     When SATIM returns a non-zero error code
   * @throws {SatimNetworkError} On HTTP/network failures
   */
  async reverseOrder(params: ReverseOrderParams): Promise<ReverseOrderResponse> {
    requireString(params.orderId, 'orderId');

    const raw = await this.client.post<SatimRawResponse>('/reverse.do', {
      orderId:  params.orderId,
      language: params.language ?? SatimLanguage.FR,
    });

    const errorCode = parseErrorCode(raw.errorCode);

    return {
      errorCode,
      errorMessage: raw.errorMessage,
      success:      errorCode === 0,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

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

  // ─── Private ───────────────────────────────────────────────────────────────

  private validateConfig(config: SatimConfig): void {
    if (!config.username || config.username.trim() === '') {
      throw new SatimConfigError('"username" is required in SatimConfig');
    }
    if (!config.password || config.password.trim() === '') {
      throw new SatimConfigError('"password" is required in SatimConfig');
    }
    if (!config.terminalId || config.terminalId.trim() === '') {
      throw new SatimConfigError('"terminalId" is required in SatimConfig');
    }
    if (config.timeout !== undefined && (config.timeout <= 0 || !Number.isInteger(config.timeout))) {
      throw new SatimConfigError('"timeout" must be a positive integer (milliseconds)');
    }
  }
}
