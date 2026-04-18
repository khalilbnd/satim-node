import axios from 'axios';
import { Satim } from '../src/satim';
import {
  SatimConfigError,
  SatimApiError,
  SatimValidationError,
} from '../src/exceptions';
import { OrderStatus, SatimLanguage } from '../src/types';
import { centimesToDZD, DZDToCentimes } from '../src/utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper to mock the axios instance
function mockPost(data: object) {
  const instance = {
    post: jest.fn().mockResolvedValue({ data }),
  };
  mockedAxios.create.mockReturnValue(instance as any);
  return instance;
}

// ─── Config Validation ────────────────────────────────────────────────────────

describe('Satim — constructor validation', () => {
  it('throws SatimConfigError when username is empty', () => {
    expect(() => new Satim({ username: '', password: 'p', terminalId: 't' }))
      .toThrow(SatimConfigError);
  });

  it('throws SatimConfigError when password is missing', () => {
    expect(() => new Satim({ username: 'u', password: '', terminalId: 't' }))
      .toThrow(SatimConfigError);
  });

  it('throws SatimConfigError when terminalId is missing', () => {
    expect(() => new Satim({ username: 'u', password: 'p', terminalId: '' }))
      .toThrow(SatimConfigError);
  });

  it('constructs successfully with valid config', () => {
    expect(() => new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true }))
      .not.toThrow();
  });
});

// ─── registerOrder ────────────────────────────────────────────────────────────

describe('Satim.registerOrder()', () => {
  const validParams = {
    orderNumber: 'ORD-001',
    amount:      150000,
    returnUrl:   'https://example.dz/success',
    failUrl:     'https://example.dz/fail',
    description: 'Test order',
  };

  it('returns orderId and formUrl on success', async () => {
    mockPost({ errorCode: 0, orderId: 'satim-id-123', formUrl: 'https://test.satim.dz/pay' });
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    const result = await satim.registerOrder(validParams);
    expect(result.orderId).toBe('satim-id-123');
    expect(result.formUrl).toBe('https://test.satim.dz/pay');
  });

  it('throws SatimApiError when errorCode is non-zero', async () => {
    mockPost({ errorCode: 1, errorMessage: 'Order number already exists' });
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    await expect(satim.registerOrder(validParams)).rejects.toThrow(SatimApiError);
  });

  it('throws when amount is zero', async () => {
    mockPost({});
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    await expect(satim.registerOrder({ ...validParams, amount: 0 }))
      .rejects.toThrow();
  });

  it('throws when returnUrl is invalid', async () => {
    mockPost({});
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    await expect(satim.registerOrder({ ...validParams, returnUrl: 'not-a-url' }))
      .rejects.toThrow();
  });
});

// ─── getOrderStatus ───────────────────────────────────────────────────────────

describe('Satim.getOrderStatus()', () => {
  it('parses a successful status response', async () => {
    mockPost({
      errorCode:    0,
      orderStatus:  2,
      orderNumber:  'ORD-001',
      amount:       150000,
      currency:     '012',
      actionCode:   0,
      cardAuthInfo: { pan: '4111111111111111', expiration: '2512' },
    });

    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    const status = await satim.getOrderStatus({ orderId: 'satim-id-123' });

    expect(status.orderStatus).toBe(OrderStatus.AUTHORIZED);
    expect(status.orderNumber).toBe('ORD-001');
    expect(status.amount).toBe(150000);
    expect(status.cardAuthInfo?.maskedPan).toBe('4111111111111111');
  });

  it('correctly identifies a successful payment', async () => {
    mockPost({ errorCode: 0, orderStatus: 2, orderNumber: 'ORD-001', amount: 150000, currency: '012', actionCode: 0 });
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    const status = await satim.getOrderStatus({ orderId: 'satim-id-123' });
    expect(satim.isPaymentSuccessful(status)).toBe(true);
  });

  it('correctly identifies a failed payment', async () => {
    mockPost({ errorCode: 0, orderStatus: 6, orderNumber: 'ORD-001', amount: 150000, currency: '012', actionCode: 0 });
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    const status = await satim.getOrderStatus({ orderId: 'satim-id-123' });
    expect(satim.isPaymentSuccessful(status)).toBe(false);
  });
});

// ─── confirmOrder ─────────────────────────────────────────────────────────────

describe('Satim.confirmOrder()', () => {
  it('returns success: true on errorCode 0', async () => {
    mockPost({ errorCode: 0 });
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    const res = await satim.confirmOrder({ orderId: 'satim-id-123', amount: 150000 });
    expect(res.success).toBe(true);
    expect(res.errorCode).toBe(0);
  });

  it('returns success: false on non-zero errorCode', async () => {
    mockPost({ errorCode: 7, errorMessage: 'Invalid amount' });
    const satim = new Satim({ username: 'u', password: 'p', terminalId: 't', sandbox: true });
    const res = await satim.confirmOrder({ orderId: 'satim-id-123', amount: 150000 });
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe(7);
  });
});

// ─── Utilities ────────────────────────────────────────────────────────────────

describe('Utility functions', () => {
  it('converts centimes to DZD', () => {
    expect(centimesToDZD(100000)).toBe(1000);
    expect(centimesToDZD(150000)).toBe(1500);
  });

  it('converts DZD to centimes', () => {
    expect(DZDToCentimes(1000)).toBe(100000);
    expect(DZDToCentimes(1500.50)).toBe(150050);
  });
});
