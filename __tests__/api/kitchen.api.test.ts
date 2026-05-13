import { apiClient } from '@/api/client';
import { getKitchenOrders, updateKitchenItemStatus } from '@/api/kitchen.api';

describe('kitchen api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads kitchen orders with station query', async () => {
    const orders = [{ id: 'o1', tableNumber: '5', items: [], status: 'pending', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }];
    const spy = jest.spyOn(apiClient, 'get').mockResolvedValue({ data: orders } as never);

    const result = await getKitchenOrders('bar');

    expect(spy).toHaveBeenCalledWith('/kitchen/orders', { params: { station: 'bar' } });
    expect(result.data).toEqual(orders);
  });

  it('normalizes wrapped payload shape', async () => {
    const wrapped = { data: [{ id: 'o2', tableNumber: '7', items: [], status: 'pending', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }] };
    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: wrapped } as never);

    const result = await getKitchenOrders();

    expect(result.data).toEqual(wrapped.data);
  });

  it('updates kitchen item status', async () => {
    const spy = jest.spyOn(apiClient, 'patch').mockResolvedValue({ data: undefined } as never);

    await updateKitchenItemStatus('order-1', 'item-1', 'ready');

    expect(spy).toHaveBeenCalledWith('/kitchen/orders/order-1/items/item-1/status', {
      status: 'READY',
    });
  });
});
