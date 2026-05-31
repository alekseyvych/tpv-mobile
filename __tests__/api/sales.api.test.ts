import { apiClient } from '@/api/client';
import { createSale, completeSale, refundSale } from '@/api/sales.api';

describe('sales api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a sale', async () => {
    const sale = { id: 'sale-1', status: 'OPEN', lines: [], payments: [], subtotal: 0, tax: 0, total: 0, createdAt: '2024-01-01T00:00:00Z' };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: sale } as never);

    const result = await createSale([], 'shift-abc');

    expect(spy).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({
        lineItems: [],
        cashShiftId: 'shift-abc',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      }),
    );
    expect(result.id).toBe('sale-1');
  });

  it('forwards Idempotency-Key for createSale when provided', async () => {
    const sale = {
      id: 'sale-2',
      status: 'OPEN',
      lines: [],
      payments: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: '2024-01-01T00:00:00Z',
    };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: sale } as never);

    await createSale([], 'shift-abc', 'mobile-create-idem-1');

    expect(spy).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ lineItems: [], cashShiftId: 'shift-abc' }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-create-idem-1' }),
      }),
    );
  });

  it('generates Idempotency-Key for createSale when not provided', async () => {
    const sale = {
      id: 'sale-3',
      status: 'OPEN',
      lines: [],
      payments: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: '2024-01-01T00:00:00Z',
    };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: sale } as never);

    await createSale([], 'shift-abc');

    expect(spy).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ lineItems: [], cashShiftId: 'shift-abc' }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      }),
    );
  });

  it('forwards Idempotency-Key for completeSale when provided', async () => {
    const completedSale = {
      id: 'sale-4',
      status: 'PAID',
      total: 10,
      lines: [],
      payments: [],
      createdAt: '2024-01-01T00:00:00Z',
    };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: completedSale } as never);

    await completeSale(
      'sale-4',
      [{ method: 'CASH', amount: 10, amountTendered: 20 }],
      'mobile-complete-idem-1',
    );

    expect(spy).toHaveBeenCalledWith(
      '/sales/sale-4/complete',
      expect.objectContaining({
        payments: [{ method: 'cash', amount: 10, amountTendered: 20 }],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-complete-idem-1' }),
      }),
    );
  });

  it('forwards Idempotency-Key for refundSale when provided', async () => {
    const refund = { id: 'refund-1', saleId: 'sale-5', amount: 5, reason: 'customer return' };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: refund } as never);

    await refundSale('sale-5', 5, 'customer return', 'mobile-refund-idem-1');

    expect(spy).toHaveBeenCalledWith(
      '/sales/sale-5/refund',
      { amount: 5, reason: 'customer return' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-refund-idem-1' }),
      }),
    );
  });

  it('generates Idempotency-Key for refundSale when not provided', async () => {
    const refund = { id: 'refund-2', saleId: 'sale-6', amount: 2, reason: 'rounding' };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: refund } as never);

    await refundSale('sale-6', 2, 'rounding');

    expect(spy).toHaveBeenCalledWith(
      '/sales/sale-6/refund',
      { amount: 2, reason: 'rounding' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      }),
    );
  });
});
