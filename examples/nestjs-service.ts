/**
 * NestJS integration example for satim-node.
 *
 * Drop SatimModule into your AppModule and inject SatimService
 * wherever you need to process payments.
 */

import { Injectable, Module, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Satim, SatimApiError, SatimNetworkError, DZDToCentimes, OrderStatusResponse } from 'satim-node';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SatimService {
  private readonly satim: Satim;

  constructor() {
    this.satim = new Satim({
      username:   process.env.SATIM_USERNAME   ?? '',
      password:   process.env.SATIM_PASSWORD   ?? '',
      terminalId: process.env.SATIM_TERMINAL   ?? '',
      sandbox:    process.env.NODE_ENV !== 'production',
    });
  }

  async initiatePayment(orderNumber: string, amountDZD: number): Promise<{ orderId: string; formUrl: string }> {
    try {
      return await this.satim.registerOrder({
        orderNumber,
        amount:      DZDToCentimes(amountDZD),
        returnUrl:   `${process.env.APP_URL}/payment/callback`,
        failUrl:     `${process.env.APP_URL}/payment/fail`,
        description: `Order ${orderNumber}`,
      });
    } catch (err) {
      this.handleError(err);
    }
  }

  async verifyPayment(orderId: string): Promise<{ success: boolean; status: OrderStatusResponse }> {
    try {
      const status = await this.satim.getOrderStatus({ orderId });
      return { success: this.satim.isPaymentSuccessful(status), status };
    } catch (err) {
      this.handleError(err);
    }
  }

  async refund(orderId: string, amountDZD: number): Promise<{ success: boolean }> {
    try {
      return await this.satim.refundOrder({ orderId, amount: DZDToCentimes(amountDZD) });
    } catch (err) {
      this.handleError(err);
    }
  }

  private handleError(err: unknown): never {
    if (err instanceof SatimApiError) {
      throw new BadRequestException(`SATIM: ${err.errorMessage} (code ${err.errorCode})`);
    }
    if (err instanceof SatimNetworkError) {
      throw new ServiceUnavailableException('Payment gateway unreachable');
    }
    throw err;
  }
}

// ─── Module ───────────────────────────────────────────────────────────────────

@Module({
  providers: [SatimService],
  exports:   [SatimService],
})
export class SatimModule {}
