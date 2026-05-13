import { apiClient } from './client';
import type { RestaurantOrder } from '@/types/restaurant';

export type KitchenPrepStation = 'kitchen' | 'bar' | 'all';
export type KitchenItemStatus = 'pending' | 'preparing' | 'ready' | 'served';

/**
 * Get kitchen orders for KDS board.
 * GET /kitchen/orders?station=kitchen|bar|all
 */
export async function getKitchenOrders(
  station: KitchenPrepStation = 'kitchen'
): Promise<{ data: RestaurantOrder[] }> {
  const response = await apiClient.get<unknown>('/kitchen/orders', {
    params: { station },
  });

  const payload = response.data as { data?: unknown } | unknown[];
  const normalized = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray(payload.data)
    ? payload.data
    : [];

  return { data: normalized as RestaurantOrder[] };
}

/**
 * Update a kitchen item status in the same flow used by desktop.
 * PATCH /kitchen/orders/{orderId}/items/{itemId}/status
 */
export async function updateKitchenItemStatus(
  orderId: string,
  itemId: string,
  status: KitchenItemStatus | Uppercase<KitchenItemStatus>
): Promise<void> {
  await apiClient.patch(`/kitchen/orders/${orderId}/items/${itemId}/status`, {
    status: status.toUpperCase(),
  });
}
