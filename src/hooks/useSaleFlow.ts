import { useCallback, useRef, useState } from 'react';

import { createSale, completeSale } from '@/api/sales.api';
import { analyticsService } from '@/services/AnalyticsService';
import { useSaleStore } from '@/store/sale.store';
import { useTerminalStore } from '@/store/terminal.store';
import type { PaymentDto, SaleDto, SaleLineInputDto } from '@/types/api';
import { generateUUID } from '@/utils/uuid';

export function useSaleFlow() {
  const lines = useSaleStore((s) => s.lines);
  const addLine = useSaleStore((s) => s.addLine);
  const removeLine = useSaleStore((s) => s.removeLine);
  const clearCart = useSaleStore((s) => s.clearCart);
  const total = useSaleStore((s) => s.total);
  const setLastSaleId = useSaleStore((s) => s.setLastSaleId);
  const lastSaleId = useSaleStore((s) => s.lastSaleId);
  const activeCashShiftId = useTerminalStore((s) => s.activeCashShiftId);
  const [pendingSale, setPendingSale] = useState<SaleDto | null>(null);

  // Keep stable keys while the same operation intent is being retried.
  const createKeyRef = useRef<string | null>(null);
  const completionKeyRef = useRef<string | null>(null);

  const toSaleLineInputs = useCallback((): SaleLineInputDto[] => {
    return lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      // Note: unitPrice is NOT sent — backend calculates from product catalog
    }));
  }, [lines]);

  const prepareSale = useCallback(async (): Promise<SaleDto> => {
    if (pendingSale && pendingSale.status === 'OPEN') {
      return pendingSale;
    }

    if (!activeCashShiftId) {
      throw new Error('No active cash shift. Please select a terminal with an open shift.');
    }

    const lineInputs = toSaleLineInputs();
    const createKey = createKeyRef.current ?? generateUUID();
    createKeyRef.current = createKey;

    const sale = await createSale(lineInputs, activeCashShiftId, createKey);
    setPendingSale(sale);
    createKeyRef.current = null;
    return sale;
  }, [activeCashShiftId, pendingSale, toSaleLineInputs]);

  const completePendingSale = useCallback(
    async (payments: PaymentDto[]): Promise<string> => {
      const sale = pendingSale ?? (await prepareSale());

      const completionKey = completionKeyRef.current ?? generateUUID();
      completionKeyRef.current = completionKey;

      const completed = await completeSale(sale.id, payments, completionKey);
      setLastSaleId(completed.id);

      await analyticsService.trackEvent('sale.completed', {
        saleId: completed.id,
        methods: payments.map((payment) => payment.method).join(','),
        amount: completed.total,
      });

      await analyticsService.trackEvent('payment.completed', {
        saleId: completed.id,
        methods: payments.map((payment) => payment.method).join(','),
      });

      clearCart();
      setPendingSale(null);
      completionKeyRef.current = null;
      createKeyRef.current = null;
      return completed.id;
    },
    [clearCart, pendingSale, prepareSale, setLastSaleId],
  );

  const submitSale = useCallback(
    async (method: 'CASH' | 'CARD', amountTendered?: number) => {
      const payments: PaymentDto[] = [
        {
          method,
          amount: total(),
          amountTendered,
        },
      ];
      return completePendingSale(payments);
    },
    [completePendingSale, total],
  );

  const submitMixedSale = useCallback(
    async (cashAmount: number, cardAmount: number, amountTendered?: number) => {
      const payments: PaymentDto[] = [];
      if (cashAmount > 0) {
        payments.push({
          method: 'CASH',
          amount: cashAmount,
          amountTendered,
        });
      }

      if (cardAmount > 0) {
        payments.push({
          method: 'CARD',
          amount: cardAmount,
        });
      }

      return completePendingSale(payments);
    },
    [completePendingSale],
  );

  const resetPendingSale = useCallback(() => {
    setPendingSale(null);
    completionKeyRef.current = null;
    createKeyRef.current = null;
  }, []);

  return {
    lines,
    lastSaleId,
    pendingSale,
    addLine,
    removeLine,
    total: total(),
    prepareSale,
    completePendingSale,
    submitSale,
    submitMixedSale,
    resetPendingSale,
  };
}
