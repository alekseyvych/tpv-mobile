import type { PaymentDto } from '@/types/api';

export type RestaurantPaymentMethod = 'CASH' | 'CARD' | 'MIXED';

type SaleLineLike = {
  id?: string;
  productId?: string;
  quantity?: number;
  lineTotal?: number;
  total?: number;
};

export function toMoney(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

export function buildMixedPayments(total: number, mixedCashAmount: string): PaymentDto[] {
  const cashPart = toMoney(mixedCashAmount);
  const cardPart = Math.round((total - cashPart) * 100) / 100;

  return [
    {
      method: 'CASH',
      amount: cashPart,
      amountTendered: cashPart,
    },
    {
      method: 'CARD',
      amount: cardPart,
    },
  ];
}

export function buildRestaurantPayments(args: {
  method: RestaurantPaymentMethod;
  iterationTotal: number;
  cashTendered: string;
  mixedCashAmount: string;
  mixedAmountErrorMessage: string;
}): PaymentDto[] {
  const { method, iterationTotal, cashTendered, mixedCashAmount, mixedAmountErrorMessage } = args;

  if (method === 'CASH') {
    return [
      {
        method: 'CASH',
        amount: iterationTotal,
        amountTendered: Math.max(toMoney(cashTendered), iterationTotal),
      },
    ];
  }

  if (method === 'CARD') {
    return [{ method: 'CARD', amount: iterationTotal }];
  }

  const cashPart = toMoney(mixedCashAmount);
  const cardPart = Math.round((iterationTotal - cashPart) * 100) / 100;
  if (cashPart <= 0 || cardPart <= 0) {
    throw new Error(mixedAmountErrorMessage);
  }
  return buildMixedPayments(iterationTotal, mixedCashAmount);
}

export function getSaleLines(
  sale: unknown,
): Array<{ id?: string; productId: string; quantity: number; total: number }> {
  const raw = sale as { lines?: SaleLineLike[]; items?: SaleLineLike[]; lineItems?: SaleLineLike[] };
  const rows = raw.lines ?? raw.items ?? raw.lineItems ?? [];
  return rows.map((line) => ({
    id: typeof line.id === 'string' ? line.id : undefined,
    productId: String(line.productId ?? ''),
    quantity: Number(line.quantity ?? 0),
    total: Math.round(Number(line.lineTotal ?? line.total ?? 0) * 100) / 100,
  }));
}

export function computeIterationTotalFromMappedSale(args: {
  consumeStockLineItemIds: string[];
  sale: unknown;
  selectedTotal: number;
  selectedSnapshots: Array<{ total: number }>;
  fallbackErrorMessage: string;
}): number {
  const { consumeStockLineItemIds, sale, selectedTotal, selectedSnapshots, fallbackErrorMessage } = args;
  const saleLines = getSaleLines(sale);
  const saleLineTotals = consumeStockLineItemIds.map((lineId) => {
    const line = saleLines.find((row) => row.id === lineId);
    if (!line) {
      throw new Error(fallbackErrorMessage);
    }
    const lineTotal = Number(line.total);
    if (!Number.isFinite(lineTotal) || lineTotal < 0) {
      throw new Error(fallbackErrorMessage);
    }
    return Math.round(lineTotal * 100) / 100;
  });
  const hasMappedSaleTotals = saleLineTotals.length > 0;

  let iterationTotal = hasMappedSaleTotals
    ? Math.round(saleLineTotals.reduce((sum, value) => sum + value, 0) * 100) / 100
    : Math.round(selectedTotal * 100) / 100;

  if (iterationTotal <= 0) {
    const snapshotTotal = Math.round(
      selectedSnapshots.reduce((sum, row) => sum + row.total, 0) * 100,
    ) / 100;
    if (snapshotTotal > 0) {
      iterationTotal = snapshotTotal;
    } else {
      throw new Error(fallbackErrorMessage);
    }
  }

  return iterationTotal;
}
