import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getActiveCashShift } from '@/api/cashShifts.api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

import { completeSale, getSale, getSaleReceipt } from '@/api/sales.api';
import { restaurantApi } from '@/api/restaurant.api';
import { useTerminalStore } from '@/store/terminal.store';
import type { PaymentDto, ReceiptDto } from '@/types/api';
import type { RestaurantOrder } from '@/types/restaurant';

type Props = {
  tableId: string;
  orderId: string;
  onBack: () => void;
};

export function RestaurantCheckoutScreen({ tableId, orderId, onBack }: Props) {
  const { t } = useTranslation();
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [table, setTable] = useState<{ id: string; number?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [mixedCashAmount, setMixedCashAmount] = useState('');
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);

  const total = useMemo(() => {
    const raw = Number(order?.total ?? 0);
    return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
  }, [order?.total]);

  const remainingMixedCard = useMemo(() => {
    const cashPart = toMoney(mixedCashAmount);
    return Math.max(Math.round((total - cashPart) * 100) / 100, 0);
  }, [mixedCashAmount, total]);

  useEffect(() => {
    let mounted = true;

    async function loadContext() {
      try {
        setLoading(true);
        setError(null);

        const [tableData, orderData] = await Promise.all([
          restaurantApi.getTableById(tableId),
          restaurantApi.getOrderById(orderId)
        ]);

        if (!mounted) return;

        setTable(tableData);
        setOrder(orderData);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load checkout context');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadContext();

    return () => {
      mounted = false;
    };
  }, [tableId, orderId]);

  const loadReceipt = useCallback(async (saleId: string) => {
    try {
      const payload = await getSaleReceipt(saleId);
      setReceipt(payload);
    } catch {
      setReceipt(null);
    }
  }, []);

  const handleCancel = useCallback(async () => {
    if (completedSaleId) {
      onBack();
      return;
    }

    if (!selectedTerminalId) {
      onBack();
      return;
    }

    try {
      setReleasing(true);
      setError(null);
      await restaurantApi.releaseOrderPaymentLock(orderId, selectedTerminalId);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release payment lock');
    } finally {
      setReleasing(false);
    }
  }, [completedSaleId, orderId, onBack, selectedTerminalId]);

  const ensureSaleContext = useCallback(async () => {
    const resume = await restaurantApi.getOpenPosSaleResume(orderId);
    if (resume?.saleId) {
      return {
        saleId: resume.saleId,
        orderItemToSaleLineId: resume.orderItemIdToSaleLineId ?? {}
      };
    }

    if (!selectedTerminalId) {
      throw new Error(t('terminalSelection.required', 'Select a terminal before payment.'));
    }

    const activeShift = await getActiveCashShift(selectedTerminalId);
    const shiftId = activeShift?.id;
    if (!shiftId) {
      throw new Error(
        t(
          'dining.checkoutShiftMissing',
          'No active cash shift is open for this terminal. Open a shift before checkout.'
        )
      );
    }

    const currentOrder = await restaurantApi.getOrderById(orderId);
    if (!currentOrder.items.length) {
      throw new Error(t('payment.errors.noItems', 'No items to charge.'));
    }

    const created = await restaurantApi.createUmbrellaSale(orderId, {
      cashShiftId: shiftId,
      terminalId: selectedTerminalId,
      lineItems: currentOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
        restaurantOrderItemId: item.id
      }))
    });

    setOrder(created.order);

    return {
      saleId: created.sale.id,
      orderItemToSaleLineId: {} as Record<string, string>
    };
  }, [orderId, selectedTerminalId, t]);

  const finalizeSuccessfulRestaurantPayment = useCallback(
    async (saleId: string) => {
      await restaurantApi.closeOrder(orderId);

      if (selectedTerminalId) {
        try {
          await restaurantApi.releaseOrderPaymentLock(orderId, selectedTerminalId);
        } catch {
          // Best-effort release: lock also expires server-side.
        }
      }

      const [freshTable, freshOrder] = await Promise.all([
        restaurantApi.getTableById(tableId),
        restaurantApi.getOrderById(orderId)
      ]);

      setTable(freshTable);
      setOrder(freshOrder);
      setCompletedSaleId(saleId);
      await loadReceipt(saleId);
    },
    [loadReceipt, orderId, selectedTerminalId, tableId]
  );

  const attemptPayment = useCallback(
    async (method: 'CASH' | 'CARD' | 'MIXED') => {
      if (!order || processing || total <= 0) return;

      try {
        setProcessing(true);
        setError(null);

        const { saleId, orderItemToSaleLineId } = await ensureSaleContext();

        const consumeStockLineItemIds = order.items
          .map((item) => orderItemToSaleLineId[item.id])
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

        const payments: PaymentDto[] =
          method === 'CASH'
            ? [
                {
                  method: 'CASH',
                  amount: total,
                  amountTendered: Math.max(toMoney(cashTendered), total)
                }
              ]
            : method === 'CARD'
              ? [{ method: 'CARD', amount: total }]
              : buildMixedPayments(total, mixedCashAmount);

        await completeSale(saleId, payments, undefined, {
          consumeStockLineItemIds: consumeStockLineItemIds.length
            ? consumeStockLineItemIds
            : undefined
        });

        await finalizeSuccessfulRestaurantPayment(saleId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed';
        setError(message);
      } finally {
        setProcessing(false);
      }
    },
    [
      order,
      processing,
      total,
      ensureSaleContext,
      cashTendered,
      mixedCashAmount,
      finalizeSuccessfulRestaurantPayment
    ]
  );

  const recoverUnknownPaymentState = useCallback(async () => {
    try {
      setProcessing(true);
      setError(null);

      const resume = await restaurantApi.getOpenPosSaleResume(orderId);
      if (!resume?.saleId) {
        setError(
          t(
            'dining.checkoutRecoverMissingSale',
            'No open payment sale was found for this order. Verify the order state from dining floor.'
          )
        );
        return;
      }

      const latestSale = await getSale(resume.saleId);
      const status = String((latestSale as { status?: string }).status ?? '').toLowerCase();
      if (status === 'completed' || status === 'paid') {
        await finalizeSuccessfulRestaurantPayment(resume.saleId);
        return;
      }

      setError(
        t(
          'dining.checkoutRecoverPending',
          'Payment is still pending or failed. Retry payment or cancel checkout.'
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to recover payment state');
    } finally {
      setProcessing(false);
    }
  }, [finalizeSuccessfulRestaurantPayment, orderId, t]);

  return (
    <ScreenPage>
      <Topbar title={t('dining.checkout')} />
      <ScreenContent>
        {loading ? (
          <Card>
            <LoadingState
              title={t('dining.loadingTitle')}
              description={t('dining.loadingDescription')}
            />
          </Card>
        ) : null}

        {error ? (
          <Card>
            <ErrorState
              title={t('dining.errorTitle')}
              description={error}
              actionLabel={t('common.dismiss')}
              onAction={() => setError(null)}
            />
          </Card>
        ) : null}

        {!loading && !error ? (
          <Card>
            <TitleText>{t('dining.checkout')}</TitleText>
            <MetaText>{`${t('dining.table')} ${table?.number ?? '-'}`}</MetaText>
            <MetaText>{`${t('dining.activeOrder')}: ${order?.id ?? orderId}`}</MetaText>
            <BodyText style={{ marginTop: theme.spacing.s2 }}>
              {`${t('pos.totalLabel')}: ${total.toFixed(2)} EUR`}
            </BodyText>
            <BodyText style={{ marginTop: theme.spacing.s2 }}>
              {t('dining.paymentLocked')}
            </BodyText>

            {completedSaleId ? (
              <View style={styles.completionWrap}>
                <MetaText>{`${t('pos.saleIdLabel', 'Sale')}: ${completedSaleId}`}</MetaText>
                <BodyText>
                  {t(
                    'dining.checkoutPaidSuccess',
                    'Payment completed and table/order state has been updated.'
                  )}
                </BodyText>
                {receipt?.receiptNumber ? (
                  <MetaText>{`${t('pos.receiptNumberLabel', 'Receipt')}: ${receipt.receiptNumber}`}</MetaText>
                ) : null}
              </View>
            ) : (
              <>
                <View style={styles.row}>
                  <Button
                    title={t('pos.payCash', 'Pay cash')}
                    onPress={() => void attemptPayment('CASH')}
                    disabled={processing}
                  />
                  <Button
                    title={t('pos.payCard', 'Pay card')}
                    onPress={() => void attemptPayment('CARD')}
                    disabled={processing}
                  />
                </View>

                <View style={styles.mixedWrap}>
                  <MetaText>{t('pos.cashTendered', 'Cash tendered')}</MetaText>
                  <TextInput
                    style={styles.input}
                    value={cashTendered}
                    onChangeText={setCashTendered}
                    keyboardType="decimal-pad"
                    placeholder={t('pos.enterCashAmount', 'e.g. 10.00')}
                  />

                  <MetaText>{t('pos.mixedCashPrompt', 'Cash amount for mixed payment')}</MetaText>
                  <TextInput
                    style={styles.input}
                    value={mixedCashAmount}
                    onChangeText={setMixedCashAmount}
                    keyboardType="decimal-pad"
                    placeholder={t('pos.enterCashAmount', 'e.g. 10.00')}
                  />
                  <BodyText>{`${t('pos.cardRemainderLabel', 'Card remainder')}: ${remainingMixedCard.toFixed(2)} EUR`}</BodyText>

                  <Button
                    title={t('pos.payMixed', 'Pay mixed')}
                    onPress={() => void attemptPayment('MIXED')}
                    disabled={processing || remainingMixedCard <= 0}
                    variant="secondary"
                  />
                </View>

                <Button
                  title={t('dining.checkoutRecoverAction', 'Recover unknown payment state')}
                  onPress={() => void recoverUnknownPaymentState()}
                  disabled={processing}
                  variant="secondary"
                  style={{ marginTop: theme.spacing.s2 }}
                />
              </>
            )}

            <Button
              title={completedSaleId ? t('common.done', 'Done') : t('common.back')}
              onPress={() => void handleCancel()}
              disabled={releasing || processing}
              variant="secondary"
              style={{ marginTop: theme.spacing.s3 }}
            />
          </Card>
        ) : null}
      </ScreenContent>
    </ScreenPage>
  );
}

function toMoney(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

function buildMixedPayments(total: number, mixedCashAmount: string): PaymentDto[] {
  const cashPart = toMoney(mixedCashAmount);
  const cardPart = Math.round((total - cashPart) * 100) / 100;
  if (cashPart <= 0 || cardPart <= 0) {
    throw new Error('Mixed payment requires positive cash and card amounts.');
  }

  return [
    {
      method: 'CASH',
      amount: cashPart,
      amountTendered: cashPart
    },
    {
      method: 'CARD',
      amount: cardPart
    }
  ];
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
    marginTop: theme.spacing.s3
  },
  mixedWrap: {
    marginTop: theme.spacing.s3,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.s3,
    gap: theme.spacing.s2
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
    backgroundColor: theme.colors.bgPanel,
    color: theme.colors.textPrimary
  },
  completionWrap: {
    marginTop: theme.spacing.s3,
    gap: theme.spacing.s2,
    paddingVertical: theme.spacing.s2
  }
});
