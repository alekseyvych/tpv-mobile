import type { RestaurantOrder } from '@/types/restaurant';

import { getOrderItemLineTotal } from '@/screens/dining/RestaurantCheckoutScreen';

function asOrderItem(overrides: Partial<RestaurantOrder['items'][number]>): RestaurantOrder['items'][number] {
  return {
    id: 'item-1',
    productId: 'product-1',
    productName: 'Sample',
    quantity: 1,
    status: 'pending',
    ...overrides,
  } as RestaurantOrder['items'][number];
}

describe('RestaurantCheckoutScreen helpers', () => {
  it('prefers lineTotal when present and positive', () => {
    const value = getOrderItemLineTotal(asOrderItem({ lineTotal: 12.34 } as unknown as Partial<RestaurantOrder['items'][number]>));
    expect(value).toBe(12.34);
  });

  it('falls back to total when lineTotal is invalid', () => {
    const value = getOrderItemLineTotal(
      asOrderItem({ lineTotal: 0, total: 15.5 } as unknown as Partial<RestaurantOrder['items'][number]>),
    );
    expect(value).toBe(15.5);
  });

  it('derives total from unitPrice * quantity with 2-decimal rounding', () => {
    const value = getOrderItemLineTotal(
      asOrderItem({ lineTotal: undefined, total: undefined, unitPrice: 4.666, quantity: 3 } as unknown as Partial<RestaurantOrder['items'][number]>),
    );
    expect(value).toBe(14);
  });

  it('returns 0 when no positive numeric source is available', () => {
    const value = getOrderItemLineTotal(
      asOrderItem({ lineTotal: null, total: null, unitPrice: -2, quantity: 3 } as unknown as Partial<RestaurantOrder['items'][number]>),
    );
    expect(value).toBe(0);
  });
});
