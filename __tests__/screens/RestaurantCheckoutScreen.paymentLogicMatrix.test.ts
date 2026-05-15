import {
  buildRestaurantPayments,
  buildMixedPayments,
  computeIterationTotalFromMappedSale,
  getSaleLines,
  type RestaurantPaymentMethod,
  toMoney,
} from '@/screens/dining/restaurantCheckoutPayment.logic';

describe('RestaurantCheckoutScreen payment logic matrix', () => {
  const fallbackError = 'payment error';

  it('computes totals from mapped sale lines (single and multi-line)', () => {
    const single = computeIterationTotalFromMappedSale({
      consumeStockLineItemIds: ['l1'],
      sale: { lineItems: [{ id: 'l1', lineTotal: 11.11 }] },
      selectedTotal: 50,
      selectedSnapshots: [{ total: 50 }],
      fallbackErrorMessage: fallbackError,
    });
    expect(single).toBe(11.11);

    const multi = computeIterationTotalFromMappedSale({
      consumeStockLineItemIds: ['l1', 'l2', 'l3'],
      sale: {
        lineItems: [
          { id: 'l1', lineTotal: 9.1 },
          { id: 'l2', lineTotal: 8.2 },
          { id: 'l3', lineTotal: 7.3 },
        ],
      },
      selectedTotal: 99,
      selectedSnapshots: [{ total: 99 }],
      fallbackErrorMessage: fallbackError,
    });
    expect(multi).toBe(24.6);
  });

  it('throws when mapped line is missing or invalid', () => {
    expect(() =>
      computeIterationTotalFromMappedSale({
        consumeStockLineItemIds: ['l1'],
        sale: { lineItems: [] },
        selectedTotal: 1,
        selectedSnapshots: [{ total: 1 }],
        fallbackErrorMessage: fallbackError,
      })
    ).toThrow(fallbackError);

    expect(() =>
      computeIterationTotalFromMappedSale({
        consumeStockLineItemIds: ['l1'],
        sale: { lineItems: [{ id: 'l1', lineTotal: -1 }] },
        selectedTotal: 1,
        selectedSnapshots: [{ total: 1 }],
        fallbackErrorMessage: fallbackError,
      })
    ).toThrow(fallbackError);
  });

  it('falls back to selected/snapshot totals when no mappings provided', () => {
    const fromSelected = computeIterationTotalFromMappedSale({
      consumeStockLineItemIds: [],
      sale: { lineItems: [] },
      selectedTotal: 12.34,
      selectedSnapshots: [{ total: 1 }],
      fallbackErrorMessage: fallbackError,
    });
    expect(fromSelected).toBe(12.34);

    const fromSnapshots = computeIterationTotalFromMappedSale({
      consumeStockLineItemIds: [],
      sale: { lineItems: [] },
      selectedTotal: 0,
      selectedSnapshots: [{ total: 5.01 }, { total: 4.99 }],
      fallbackErrorMessage: fallbackError,
    });
    expect(fromSnapshots).toBe(10);
  });

  it('builds payments correctly for all methods', () => {
    const cash = buildRestaurantPayments({
      method: 'CASH',
      iterationTotal: 12,
      cashTendered: '20',
      mixedCashAmount: '0',
      mixedAmountErrorMessage: 'mixed error',
    });
    expect(cash).toEqual([{ method: 'CASH', amount: 12, amountTendered: 20 }]);

    const card = buildRestaurantPayments({
      method: 'CARD',
      iterationTotal: 12,
      cashTendered: '0',
      mixedCashAmount: '0',
      mixedAmountErrorMessage: 'mixed error',
    });
    expect(card).toEqual([{ method: 'CARD', amount: 12 }]);

    const mixed = buildRestaurantPayments({
      method: 'MIXED',
      iterationTotal: 12,
      cashTendered: '0',
      mixedCashAmount: '5',
      mixedAmountErrorMessage: 'mixed error',
    });
    expect(mixed).toEqual([
      { method: 'CASH', amount: 5, amountTendered: 5 },
      { method: 'CARD', amount: 7 },
    ]);
  });

  it('rejects invalid mixed splits', () => {
    expect(() =>
      buildRestaurantPayments({
        method: 'MIXED',
        iterationTotal: 12,
        cashTendered: '0',
        mixedCashAmount: '0',
        mixedAmountErrorMessage: 'mixed error',
      })
    ).toThrow('mixed error');

    expect(() =>
      buildRestaurantPayments({
        method: 'MIXED',
        iterationTotal: 12,
        cashTendered: '0',
        mixedCashAmount: '12',
        mixedAmountErrorMessage: 'mixed error',
      })
    ).toThrow('mixed error');
  });

  it('covers method combinations for split bills up to 8 items (full Cartesian)', () => {
    const methods: RestaurantPaymentMethod[] = ['CASH', 'CARD', 'MIXED'];
    const itemCount = 8;
    const prices = Array.from({ length: itemCount }, (_, i) => Math.round((1.11 + i * 0.37) * 100) / 100);

    const methodVectors: RestaurantPaymentMethod[][] = [[]];
    for (let i = 0; i < itemCount; i++) {
      const next: RestaurantPaymentMethod[][] = [];
      for (const vec of methodVectors) {
        for (const m of methods) next.push([...vec, m]);
      }
      methodVectors.splice(0, methodVectors.length, ...next);
    }

    for (const vec of methodVectors) {
      for (let i = 0; i < itemCount; i++) {
        const total = prices[i];
        const method = vec[i];
        const mixedCash = Math.round((total / 2) * 100) / 100;

        const payments = buildRestaurantPayments({
          method,
          iterationTotal: total,
          cashTendered: String(total),
          mixedCashAmount: String(mixedCash),
          mixedAmountErrorMessage: 'mixed error',
        });

        const paid = Math.round(
          payments.reduce((sum, p) => sum + Number(p.amount), 0) * 100,
        ) / 100;

        expect(paid).toBe(total);
      }
    }
  });

  it('simulates 20-item split flow paying one item per step across rotating methods', () => {
    const itemCount = 20;
    const prices = Array.from({ length: itemCount }, (_, i) => Math.round((2 + i * 0.15) * 100) / 100);
    const sale = {
      lineItems: prices.map((price, i) => ({
        id: `l${i + 1}`,
        lineTotal: price,
      })),
    };

    const methods: RestaurantPaymentMethod[] = ['CASH', 'CARD', 'MIXED'];
    let cumulative = 0;

    for (let i = 0; i < itemCount; i++) {
      const lineId = `l${i + 1}`;
      const total = computeIterationTotalFromMappedSale({
        consumeStockLineItemIds: [lineId],
        sale,
        selectedTotal: 999,
        selectedSnapshots: [{ total: 999 }],
        fallbackErrorMessage: fallbackError,
      });

      const method = methods[i % methods.length];
      const mixedCash = Math.round((total / 2) * 100) / 100;
      const payments = buildRestaurantPayments({
        method,
        iterationTotal: total,
        cashTendered: String(total),
        mixedCashAmount: String(mixedCash),
        mixedAmountErrorMessage: 'mixed error',
      });

      const paid = Math.round(
        payments.reduce((sum, p) => sum + Number(p.amount), 0) * 100,
      ) / 100;

      expect(paid).toBe(total);
      cumulative = Math.round((cumulative + paid) * 100) / 100;
    }

    const saleTotal = Math.round(prices.reduce((sum, p) => sum + p, 0) * 100) / 100;
    expect(cumulative).toBe(saleTotal);
  });

  it('throws when no mapping and selected/snapshot totals are zero', () => {
    expect(() =>
      computeIterationTotalFromMappedSale({
        consumeStockLineItemIds: [],
        sale: { lineItems: [] },
        selectedTotal: 0,
        selectedSnapshots: [{ total: 0 }],
        fallbackErrorMessage: fallbackError,
      })
    ).toThrow(fallbackError);
  });

  it('supports sale line extraction from lines/items/lineItems shapes', () => {
    expect(getSaleLines({ lines: [{ id: 'a', productId: 'p', quantity: 1, lineTotal: 1.11 }] })).toEqual([
      { id: 'a', productId: 'p', quantity: 1, total: 1.11 },
    ]);
    expect(getSaleLines({ items: [{ id: 'b', productId: 'q', quantity: 2, total: 2.22 }] })).toEqual([
      { id: 'b', productId: 'q', quantity: 2, total: 2.22 },
    ]);
    expect(getSaleLines({ lineItems: [{ id: 'c', productId: 'r', quantity: 3, lineTotal: 3.33 }] })).toEqual([
      { id: 'c', productId: 'r', quantity: 3, total: 3.33 },
    ]);

    expect(getSaleLines({ lines: [{ id: 123, quantity: undefined, total: undefined }] })).toEqual([
      { id: undefined, productId: '', quantity: 0, total: 0 },
    ]);

    expect(getSaleLines({})).toEqual([]);
  });

  it('normalizes money parsing and mixed payment split helpers', () => {
    expect(toMoney('12,34')).toBe(12.34);
    expect(toMoney('not-a-number')).toBe(0);

    expect(buildMixedPayments(10, '4,5')).toEqual([
      { method: 'CASH', amount: 4.5, amountTendered: 4.5 },
      { method: 'CARD', amount: 5.5 },
    ]);
  });

  it('ensures cash tendered never drops below iteration total', () => {
    const payments = buildRestaurantPayments({
      method: 'CASH',
      iterationTotal: 12.5,
      cashTendered: '5',
      mixedCashAmount: '0',
      mixedAmountErrorMessage: 'mixed error',
    });
    expect(payments).toEqual([{ method: 'CASH', amount: 12.5, amountTendered: 12.5 }]);
  });
});
