/**
 * SATIM REST API endpoint paths (relative to the payment/rest base URL).
 */
export const Endpoints = {
  REGISTER: '/register.do',
  STATUS: '/getOrderStatusExtended.do',
  CONFIRM: '/confirmOrder.do',
  REFUND: '/refund.do',
  REVERSE: '/reverse.do',
} as const;

export type EndpointPath = (typeof Endpoints)[keyof typeof Endpoints];

/** Logical operation names used for timeouts, errors, and logging metadata. */
export type OperationName =
  'registerOrder' | 'confirmOrder' | 'refund' | 'status' | 'reverse' | 'token';
