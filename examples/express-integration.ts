/**
 * Express.js integration example for satim-node.
 *
 * This is a minimal example showing how to integrate SATIM payments
 * into an Express application.
 *
 * Install deps:  npm install express satim-node
 */

import express from 'express';
import { Satim, SatimApiError, SatimNetworkError, DZDToCentimes, OrderStatus, getLocalizedMessage } from '../src/index';

require('dotenv').config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Initialise SATIM client ──────────────────────────────────────────────────

const satim = new Satim({
  username: process.env.SATIM_USERNAME ?? '',
  password: process.env.SATIM_PASSWORD ?? '',
  terminalId: process.env.SATIM_TERMINAL_ID ?? '',
  baseUrl: process.env.SATIM_API_URL,
  verifySsl: process.env.SATIM_HTTP_VERIFY_SSL === 'false' ? false : true,
  sandbox: process.env.NODE_ENV !== 'production',
  debug: true,
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /checkout
 *
 * Body: { orderId: string, amountDZD: number }
 *
 * Registers the order with SATIM and returns the payment URL.
 */
app.post('/checkout', async (req, res) => {
  try {
    const { orderId, amountDZD } = req.body as { orderId: string; amountDZD: number };

    const { formUrl, orderId: satimOrderId } = await satim.registerOrder({
      orderNumber: orderId,
      amount: DZDToCentimes(amountDZD),   // convert 5000 DZD → 500000 centimes
      returnUrl: `${process.env.APP_URL}/payment/success`,
      failUrl: `${process.env.APP_URL}/payment/fail`,
      description: `Order ${orderId}`,
    });

    // Persist satimOrderId in your DB, then redirect the customer
    res.json({ satimOrderId, formUrl });
  } catch (err) {
    handlePaymentError(err, res);
  }
});

/**
 * GET /payment/success?orderId=<satim-order-id>
 *
 * SATIM redirects here after payment.  We verify the status server-side.
 */
app.get('/payment/success', async (req, res) => {
  const { orderId } = req.query as { orderId: string };

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  try {
    let status = await satim.getOrderStatus({ orderId });

    // SATIM Sandbox Fix: Sometimes the redirect happens faster than the DB update.
    // If the status is 0 (REGISTERED), wait 2 seconds and try one more time.
    if (status.orderStatus === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      status = await satim.getOrderStatus({ orderId });
    }

    if (satim.isPaymentSuccessful(status)) {
      // ✅  Mark the order as paid in your database
      return res.json({
        success: true,
        orderStatus: status.orderStatus,
        orderNumber: status.orderNumber,
        amount: status.amount,
      });
    }

    const lang = (req.query.lang as string) || 'fr';

    // Payment not successful (pending / declined)
    return res.json({
      success: false,
      orderStatus: status.orderStatus,
      message: getLocalizedMessage(status.actionCode, lang),
      actionCode: status.actionCode,
      reason: status.actionCodeDescription,
      raw: status.raw
    });
  } catch (err) {
    handlePaymentError(err, res);
  }
});

/**
 * GET /payment/fail?orderId=<satim-order-id>
 */
app.get('/payment/fail', async (req, res) => {
  const { orderId } = req.query as { orderId: string };

  if (!orderId) {
    return res.json({ success: false, message: 'Payment cancelled before starting' });
  }

  const lang = (req.query.lang as string) || 'fr';

  try {
    const status = await satim.getOrderStatus({ orderId });

    res.json({
      success: false,
      message: getLocalizedMessage(status.actionCode, lang),
      actionCode: status.actionCode,
      reason: status.actionCodeDescription,
      orderStatus: status.orderStatus,
      orderId,
      raw: status.raw
    });
  } catch (err) {
    handlePaymentError(err, res);
  }
});

/**
 * POST /refund
 *
 * Body: { orderId: string, amountDZD: number }
 */
app.post('/refund', async (req, res) => {
  try {
    const { orderId, amountDZD } = req.body as { orderId: string; amountDZD: number };

    const result = await satim.refundOrder({
      orderId,
      amount: DZDToCentimes(amountDZD),
    });

    res.json(result);
  } catch (err) {
    handlePaymentError(err, res);
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────

function handlePaymentError(err: unknown, res: express.Response): void {
  const lang = (res.req.query.lang as string) || 'fr';

  if (err instanceof SatimApiError) {
    res.status(422).json({
      error: err.errorMessage,
      message: getLocalizedMessage(err.errorCode, lang),
      code: err.errorCode,
      raw: err.raw
    });
  } else if (err instanceof SatimNetworkError) {
    res.status(502).json({ error: 'Payment gateway unreachable', details: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error', err });
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
