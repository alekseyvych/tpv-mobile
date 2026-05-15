import { useSaleStore } from '@/store/sale.store';

describe('sale.store', () => {
  beforeEach(() => {
    useSaleStore.setState({ lines: [], lastSaleId: null });
  });

  it('adds products and merges quantity for duplicate product IDs', () => {
    useSaleStore.getState().addLine({ productId: 'p1', name: 'Coffee', price: 2.5 });
    useSaleStore.getState().addLine({ productId: 'p1', name: 'Coffee', price: 2.5 });
    useSaleStore.getState().addLine({ productId: 'p2', name: 'Cake', price: 3 });

    const lines = useSaleStore.getState().lines;
    expect(lines).toHaveLength(2);
    expect(lines.find((line) => line.productId === 'p1')?.quantity).toBe(2);
    expect(lines.find((line) => line.productId === 'p2')?.quantity).toBe(1);
  });

  it('computes total using line price multiplied by quantity', () => {
    useSaleStore.getState().addLine({ productId: 'p1', name: 'Coffee', price: 2.5 });
    useSaleStore.getState().addLine({ productId: 'p1', name: 'Coffee', price: 2.5 });
    useSaleStore.getState().addLine({ productId: 'p2', name: 'Cake', price: 3 });

    expect(useSaleStore.getState().total()).toBe(8);
  });

  it('removes lines by product ID and clears cart state', () => {
    useSaleStore.getState().addLine({ productId: 'p1', name: 'Coffee', price: 2.5 });
    useSaleStore.getState().addLine({ productId: 'p2', name: 'Cake', price: 3 });

    useSaleStore.getState().removeLine('p1');
    expect(useSaleStore.getState().lines).toEqual([
      expect.objectContaining({ productId: 'p2' }),
    ]);

    useSaleStore.getState().clearCart();
    expect(useSaleStore.getState().lines).toEqual([]);
  });

  it('stores and clears last sale id', () => {
    useSaleStore.getState().setLastSaleId('sale-1');
    expect(useSaleStore.getState().lastSaleId).toBe('sale-1');

    useSaleStore.getState().setLastSaleId(null);
    expect(useSaleStore.getState().lastSaleId).toBeNull();
  });
});
