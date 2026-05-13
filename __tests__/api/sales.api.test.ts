import { apiClient } from '@/api/client';
import { createSale } from '@/api/sales.api';

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
      })
    );
    expect(result.id).toBe('sale-1');
  });
});
