import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getActiveCashShift } from '@/api/cashShifts.api';
import { logError, logInfo } from '@/utils/logger';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

import { completeSale, getSale, getSaleReceipt } from '@/api/sales.api';
import {
  fetchCardPaymentDevSnapshot,
  fetchCardPaymentStatus,
  fetchTerminalPaymentSettings,
  resolveCardPaymentDevOutcome,
  startCardPayment,
} from '@/api/card-payment-runtime.api';
import { getTerminal } from '@/api/terminals.api';
import { restaurantApi } from '@/api/restaurant.api';
import { useTerminalStore } from '@/store/terminal.store';
import {
  buildRestaurantPayments,
  computeIterationTotalFromMappedSale,
  getSaleLines,
  type RestaurantPaymentMethod,
} from '@/screens/dining/restaurantCheckoutPayment.logic';
import type { TpvProviderOutcome } from '@/api/card-payment-runtime.api';
import type { PaymentDto, ReceiptDto } from '@/types/api';
import type { RestaurantOrder } from '@/types/restaurant';

type Props = {
  tableId: string;
  orderId: string;
  onBack: () => void;
  onSuccess?: () => void;
};

type PendingDevSimPayment = {
  saleId: string;
  cardTxId: string;
  cardAmount: number;
  payments: PaymentDto[];
  consumeStockLineItemIds: string[];
  selectedRows: Array<{ id: string; productId: string; quantity: number }>;
  selectedSnapshots: Array<{ productId: string; quantity: number; total: number }>;
};

export function RestaurantCheckoutScreen({ tableId, orderId, onBack, onSuccess }: Props) {
  const { t, i18n } = useTranslation();
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [table, setTable] = useState<{ id: string; number?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [mixedCashAmount, setMixedCashAmount] = useState('');
  const [method, setMethod] = useState<RestaurantPaymentMethod>('CASH');
  const [selectedOrderItemIds, setSelectedOrderItemIds] = useState<string[]>([]);
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);

  // Dev simulator state (only used when __DEV__ === true)
  const [devSimVisible, setDevSimVisible] = useState(false);
  const [devSimOutcome, setDevSimOutcome] = useState<TpvProviderOutcome>('approved');
  const [devSimDelayMs, setDevSimDelayMs] = useState(0);
  const [devSimSnapshot, setDevSimSnapshot] = useState<Record<string, unknown> | null>(null);
  const [devSimProcessing, setDevSimProcessing] = useState(false);
  const [devSimPending, setDevSimPending] = useState<PendingDevSimPayment | null>(null);
  const [terminalProfileMissingVisible, setTerminalProfileMissingVisible] = useState(false);
  const [terminalProfileMissingTerminal, setTerminalProfileMissingTerminal] = useState<string | null>(null);

  const orderTotal = useMemo(() => {
    const raw = Number(order?.total ?? 0);
    return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
  }, [order?.total]);

  const selectedItems = useMemo(
    () => (order?.items ?? []).filter((item) => selectedOrderItemIds.includes(item.id)),
    [order?.items, selectedOrderItemIds]
  );

  const selectedTotal = useMemo(() => {
    if (!order?.items?.length || !selectedItems.length) return 0;

    const explicit = selectedItems.reduce((sum, item) => sum + getOrderItemLineTotal(item), 0);
    if (explicit > 0) {
      return Math.round(explicit * 100) / 100;
    }

    const selectedQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQty <= 0) return 0;
    return Math.round((orderTotal * (selectedQty / totalQty)) * 100) / 100;
  }, [order?.items, orderTotal, selectedItems]);

  const remainingMixedCard = useMemo(() => {
    const cashPart = toMoney(mixedCashAmount);
    return Math.max(Math.round((selectedTotal - cashPart) * 100) / 100, 0);
  }, [mixedCashAmount, selectedTotal]);
  const formatAmount = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);

  const reconcileSelectedOrderItems = useCallback((nextOrder: RestaurantOrder | null) => {
    const currentIds = (nextOrder?.items ?? []).map((item) => item.id);
    if (!currentIds.length) {
      setSelectedOrderItemIds([]);
      return;
    }

    setSelectedOrderItemIds((prev) => {
      const intersection = prev.filter((id) => currentIds.includes(id));
      return intersection.length > 0 ? intersection : currentIds;
    });
  }, []);

  const loadContext = useCallback(async (withLoading = true) => {
    if (withLoading) {
      setLoading(true);
    }
    setError(null);

    const tableData = await restaurantApi.getTableById(tableId);
    let orderData: RestaurantOrder | null = null;
    try {
      orderData = await restaurantApi.getOrderById(orderId);
    } catch {
      orderData = null;
    }

    setTable(tableData);
    setOrder(orderData);
    reconcileSelectedOrderItems(orderData);
  }, [tableId, orderId, reconcileSelectedOrderItems]);

  useEffect(() => {
    let mounted = true;

    async function runLoadContext() {
      try {
        await loadContext(true);

        if (!mounted) return;
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load checkout context');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void runLoadContext();

    return () => {
      mounted = false;
    };
  }, [loadContext]);

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
      (onSuccess ?? onBack)();
      return;
    }

    if (!selectedTerminalId) {
      onBack();
      return;
    }

    try {
      setError(null);
      await restaurantApi.releaseOrderPaymentLock(orderId, selectedTerminalId);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release payment lock');
    }
  }, [completedSaleId, orderId, onBack, onSuccess, selectedTerminalId]);

  const ensureShift = useCallback(async () => {
    if (!selectedTerminalId) {
      throw new Error(t('terminalSelection.required'));
    }

    const activeShift = await getActiveCashShift(selectedTerminalId);
    const shiftId = activeShift?.id;
    if (!shiftId) {
      throw new Error(
        t('dining.checkoutShiftMissing')
      );
    }

    return { shiftId, terminalId: selectedTerminalId };
  }, [selectedTerminalId, t]);

  const createSplitIterationSale = useCallback(async (selectedIds: string[]) => {
    const currentOrder = order ?? await restaurantApi.getOrderById(orderId);
    if (!currentOrder.items.length) {
      throw new Error(t('payment.errors.noItems'));
    }

    const selectedRows = currentOrder.items.filter((item) => selectedIds.includes(item.id));
    if (!selectedRows.length) {
      throw new Error(t('dining.noItems'));
    }

    let resume = await restaurantApi.getOpenPosSaleResume(orderId);

    // Backend requires umbrella creation to align against the full current ticket,
    // then group settlement can mark only selected rows as paid.
    if (!resume?.saleId) {
      const { shiftId, terminalId } = await ensureShift();

      const umbrellaLineItems = currentOrder.items.map((item) => {
        const notes = item.notes?.trim();
        const configuration = parseOrderItemOptionsToConfiguration(item.options);
        return {
          productId: item.productId,
          quantity: item.quantity,
          ...(notes ? { notes } : {}),
          ...(configuration ? { configuration } : {}),
          restaurantOrderItemId: item.id
        };
      });

      const umbrellaBody = {
        cashShiftId: shiftId,
        terminalId,
        lineItems: umbrellaLineItems
      };

      logInfo('[RestaurantCheckout] createUmbrellaSale payload', {
        orderId,
        selectedRowsCount: selectedRows.length,
        currentOrderRowsCount: currentOrder.items.length,
        lineItemsPayloadCount: umbrellaLineItems.length,
        lineItemsPayloadJsonLength: JSON.stringify(umbrellaLineItems).length,
        selectedRowIds: selectedRows.map((r) => r.id),
      });

      const created = await restaurantApi.createUmbrellaSale(orderId, umbrellaBody);

      setOrder(created.order);
      resume = await restaurantApi.getOpenPosSaleResume(orderId);
    }

    if (!resume?.saleId) {
      throw new Error(t('pos.paymentError'));
    }

    return {
      saleId: resume.saleId,
      selectedRows,
      orderItemToSaleLineId: resume?.orderItemIdToSaleLineId ?? {}
    };
  }, [ensureShift, order, orderId, t]);

  const ensureCardTerminalProfileConfigured = useCallback(async (): Promise<string | null> => {
    if (!selectedTerminalId) {
      throw new Error(t('terminalSelection.required'));
    }

    const settings = await fetchTerminalPaymentSettings(selectedTerminalId);
    const activeProfiles = settings.allowedPaymentTerminalProfiles.filter((p) => p.isActive !== false);
    const profileId = settings.defaultPaymentTerminalProfileId ?? activeProfiles[0]?.id ?? null;
    if (profileId) return profileId;

    let terminalDisplayName = settings.terminalId ?? selectedTerminalId;
    try {
      const terminal = await getTerminal(selectedTerminalId);
      terminalDisplayName = terminal.name?.trim() || terminal.terminalId || terminalDisplayName;
    } catch {
      // Best-effort lookup; fallback keeps modal actionable.
    }
    setTerminalProfileMissingTerminal(terminalDisplayName);
    setTerminalProfileMissingVisible(true);
    return null;
  }, [selectedTerminalId, t]);

  const attemptPayment = useCallback(
    async () => {
      if (!order || processing || selectedTotal <= 0 || selectedOrderItemIds.length === 0) return;

      let devSimWillShow = false;

      try {
        setProcessing(true);
        setError(null);

        let cardTerminalProfileId: string | null = null;
        if (method === 'CARD' || method === 'MIXED') {
          cardTerminalProfileId = await ensureCardTerminalProfileConfigured();
          if (!cardTerminalProfileId) {
            return;
          }
        }

        const { saleId, selectedRows, orderItemToSaleLineId } = await createSplitIterationSale(selectedOrderItemIds);

        const consumeStockLineItemIds = selectedRows
          .map((item) => orderItemToSaleLineId[item.id])
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

        if (consumeStockLineItemIds.length !== selectedRows.length) {
          throw new Error(t('pos.paymentError'));
        }

        const sale = await getSale(saleId);
        const saleLines = getSaleLines(sale);

        // Build snapshots from actual sale line totals - order items have no price field
        const selectedSnapshots = selectedRows.map((row) => {
          const saleLineId = orderItemToSaleLineId[row.id];
          const saleLine = saleLines.find((line) => line.id === saleLineId);
          return {
            productId: row.productId,
            quantity: row.quantity,
            total: Math.round((saleLine?.total ?? 0) * 100) / 100,
          };
        });

        const iterationTotal = computeIterationTotalFromMappedSale({
          consumeStockLineItemIds,
          sale,
          selectedTotal,
          selectedSnapshots,
          fallbackErrorMessage: t('pos.paymentError'),
        });

        const payments: PaymentDto[] = buildRestaurantPayments({
          method,
          iterationTotal,
          cashTendered,
          mixedCashAmount,
          mixedAmountErrorMessage: t('pos.mixedAmountError'),
        });

        // DEV ONLY: for CARD/MIXED, start real card transaction then open simulator
        if (__DEV__ && (method === 'CARD' || method === 'MIXED') && selectedTerminalId) {
          const cardAmount =
            method === 'CARD'
              ? iterationTotal
              : Math.max(Math.round((iterationTotal - toMoney(mixedCashAmount)) * 100) / 100, 0);

          if (!cardTerminalProfileId) {
            throw new Error(t('pos.paymentError'));
          }

          const tx = await startCardPayment({
            saleId,
            amount: cardAmount,
            terminalProfileId: cardTerminalProfileId,
            posTerminalId: selectedTerminalId,
            metadata: { consumeStockLineItemIds },
          });

          const snap = await fetchCardPaymentDevSnapshot(tx.id);
          setDevSimPending({
            saleId,
            cardTxId: tx.id,
            cardAmount,
            payments,
            consumeStockLineItemIds,
            selectedRows,
            selectedSnapshots,
          });
          setDevSimSnapshot(snap?.requestSnapshot ?? null);
          devSimWillShow = true;
          setDevSimVisible(true);
          return;
        }

        await completeSale(saleId, payments, undefined, {
          consumeStockLineItemIds: consumeStockLineItemIds.length
            ? consumeStockLineItemIds
            : undefined
        });

        logInfo('[RestaurantCheckout] settlePaidGroupItems request payload', {
          orderId,
          saleId,
          selectedRowsCount: selectedRows.length,
          selectedRows,
          selectedSnapshotsCount: selectedSnapshots.length,
          selectedSnapshots,
          payments,
          consumeStockLineItemIds,
        });

        const settled = await restaurantApi.settlePaidGroupItems(orderId, {
          saleId,
          orderItemIds: selectedRows.map((row) => row.id),
          saleLineSnapshots: selectedSnapshots
        });

        setCashTendered('');
        setMixedCashAmount('');
        setMethod('CASH');

        if (settled.orderClosed) {
          if (selectedTerminalId) {
            try {
              await restaurantApi.releaseOrderPaymentLock(orderId, selectedTerminalId);
            } catch {
              // Best effort lock release on checkout completion.
            }
          }
          setCompletedSaleId(saleId);
          await loadReceipt(saleId);
          await loadContext(false);
          onSuccess?.();
          return;
        }

        await loadContext(false);
      } catch (err) {
        // Log full error details for debugging
        logError('[RestaurantCheckout] Payment attempt failed', {
          rawError: err,
          errorMessage: err instanceof Error ? err.message : String(err),
          selectedTotal,
          method,
          cashTendered,
          mixedCashAmount,
          selectedOrderItemIds,
        });
        const rawMessage = extractApiErrorMessage(err) ?? (err instanceof Error ? err.message : null);
        const message = normalizeCheckoutErrorMessage(rawMessage, t('pos.paymentError'));
        setError(message);
      } finally {
        if (!devSimWillShow) {
          setProcessing(false);
        }
      }
    },
    [
      order,
      processing,
      selectedTotal,
      createSplitIterationSale,
      cashTendered,
      mixedCashAmount,
      method,
      selectedOrderItemIds,
      orderId,
      onSuccess,
      selectedTerminalId,
      ensureCardTerminalProfileConfigured,
      t,
      loadReceipt,
      loadContext
    ]
  );

  const cashChange = useMemo(() => {
    if (method !== 'CASH') return 0;
    const tendered = toMoney(cashTendered);
    return tendered > selectedTotal ? Math.round((tendered - selectedTotal) * 100) / 100 : 0;
  }, [method, cashTendered, selectedTotal]);

  const isMixedInvalid = method === 'MIXED' && remainingMixedCard <= 0;

  const handleDevSimConfirm = useCallback(async () => {
    const pending = devSimPending;
    if (!pending) return;
    setDevSimProcessing(true);
    try {
      await resolveCardPaymentDevOutcome(pending.cardTxId, devSimOutcome, devSimDelayMs);
      const DONE_STATES = ['approved', 'declined', 'cancelled', 'timeout', 'unknown'];
      let tx = await fetchCardPaymentStatus(pending.cardTxId);
      let attempts = 0;
      while (!DONE_STATES.includes(tx.state) && attempts < 30) {
        await new Promise<void>((r) => setTimeout(r, 1000));
        tx = await fetchCardPaymentStatus(pending.cardTxId);
        attempts++;
      }
      if (tx.state !== 'approved') {
        throw new Error(t(`pos.tpvOutcomes.${devSimOutcome}`));
      }
      setDevSimVisible(false);
      setDevSimPending(null);

      const cardWasPersistedByRuntime = Boolean(tx.paymentId);
      const cashLeg = pending.payments.find(
        (p) => String(p.method).toUpperCase() === 'CASH' && Number(p.amount) > 0,
      );

      if (cardWasPersistedByRuntime) {
        // Integrated card approval already wrote card payment and updated sale state.
        // For mixed, only the cash remainder should be completed here.
        if (cashLeg) {
          await completeSale(pending.saleId, [cashLeg], undefined, {
            consumeStockLineItemIds: pending.consumeStockLineItemIds.length
              ? pending.consumeStockLineItemIds
              : undefined,
          });
        }
      } else {
        await completeSale(pending.saleId, pending.payments, undefined, {
          consumeStockLineItemIds: pending.consumeStockLineItemIds.length
            ? pending.consumeStockLineItemIds
            : undefined,
        });
      }

      const settled = await restaurantApi.settlePaidGroupItems(orderId, {
        saleId: pending.saleId,
        orderItemIds: pending.selectedRows.map((r) => r.id),
        saleLineSnapshots: pending.selectedSnapshots,
      });
      setCashTendered('');
      setMixedCashAmount('');
      setMethod('CASH');
      if (settled.orderClosed) {
        if (selectedTerminalId) {
          try {
            await restaurantApi.releaseOrderPaymentLock(orderId, selectedTerminalId);
          } catch {
            // Best effort
          }
        }
        setCompletedSaleId(pending.saleId);
        await loadReceipt(pending.saleId);
        await loadContext(false);
        onSuccess?.();
        return;
      }
        await loadContext(false);
    } catch (err) {
      // Log full error details for debugging dev simulator payment
      logError('[RestaurantCheckout] Dev simulator payment failed', {
        rawError: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        pending: pending ? {
          saleId: pending.saleId,
          cardTxId: pending.cardTxId,
          selectedSnapshots: pending.selectedSnapshots,
        } : null,
      });
      const rawMessage = extractApiErrorMessage(err) ?? (err instanceof Error ? err.message : null);
      const message = normalizeCheckoutErrorMessage(rawMessage, t('pos.paymentError'));
      setError(message);
      setDevSimVisible(false);
      setDevSimPending(null);
    } finally {
      setDevSimProcessing(false);
      setProcessing(false);
    }
  }, [devSimPending, devSimOutcome, devSimDelayMs, orderId, onSuccess, selectedTerminalId, t, loadReceipt, loadContext]);

  const handleDevSimCancel = useCallback(() => {
    setDevSimPending(null);
    setDevSimVisible(false);
    setProcessing(false);
  }, []);

  return (
    <ScreenPage>
      <Topbar title={t('dining.checkout')} onBack={() => { void handleCancel(); }} />
      <ScreenContent>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
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
            <>
              <Card>
                <MetaText>{`${t('dining.table')} ${table?.number ?? '-'}`}</MetaText>
                <BodyText style={styles.totalText}>
                  {`${t('pos.totalLabel')}: ${formatAmount(orderTotal)}`}
                </BodyText>
                <BodyText style={styles.totalText}>
                  {`${selectedItems.length} ${t('dining.items')}`}
                </BodyText>
                <BodyText style={styles.totalText}>
                  {`${t('pos.paymentLabel', 'Payment')}: ${formatAmount(selectedTotal)}`}
                </BodyText>
              </Card>

              <Card>
                <TitleText>{t('dining.items')}</TitleText>
                <View style={styles.selectAllRow}>
                  <View style={styles.itemMain} />
                  <View style={styles.itemRightCol}>
                    <Pressable
                      onPress={() => setSelectedOrderItemIds((order?.items ?? []).map((i) => i.id))}
                      disabled={processing || !!completedSaleId}
                    >
                      <MetaText style={styles.selectAllBtn}>{t('common.selectAll')}</MetaText>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedOrderItemIds([])}
                      disabled={processing || !!completedSaleId}
                    >
                      <MetaText style={styles.selectAllBtn}>{t('common.selectNone')}</MetaText>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.itemsListWrap}>
                  {order?.items.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.itemRow}
                      onPress={() => {
                        if (processing || completedSaleId) return;
                        setSelectedOrderItemIds((prev) => (
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        ));
                      }}
                    >
                      <View style={styles.itemMain}>
                        <BodyText style={styles.itemName}>{`${item.quantity}x ${item.productName}`}</BodyText>
                        {item.notes ? <MetaText style={styles.itemNotes}>{item.notes}</MetaText> : null}
                      </View>
                      <View style={styles.itemRightCol}>
                        <MetaText>{t(`kitchen.status.${item.status}`)}</MetaText>
                        <View style={[styles.checkbox, selectedOrderItemIds.includes(item.id) && styles.checkboxSelected]}>
                          <MetaText style={styles.checkboxText}>{selectedOrderItemIds.includes(item.id) ? '✓' : ''}</MetaText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </Card>

              {completedSaleId ? (
                <Card>
                  <View style={styles.completionWrap}>
                    <BodyText>{t('dining.checkoutPaidSuccess')}</BodyText>
                    {receipt?.receiptNumber ? (
                      <MetaText>{`${t('pos.receiptNumberLabel')}: ${receipt.receiptNumber}`}</MetaText>
                    ) : null}
                  </View>
                </Card>
              ) : (
                <Card>
                  <View style={styles.methodRow}>
                    {(['CASH', 'CARD', 'MIXED'] as RestaurantPaymentMethod[]).map((m) => (
                      <Pressable
                        key={m}
                        style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                        onPress={() => setMethod(m)}
                        disabled={processing}
                      >
                        <MetaText style={[styles.methodLabel, method === m && styles.methodLabelActive]}>
                          {m === 'CASH' ? t('pos.payCash') : m === 'CARD' ? t('pos.payCard') : t('pos.payMixed')}
                        </MetaText>
                      </Pressable>
                    ))}
                  </View>

                  {method === 'CASH' ? (
                    <View style={styles.methodInputsWrap}>
                      <MetaText>{t('pos.cashTendered')}</MetaText>
                      <TextInput
                        style={styles.input}
                        value={cashTendered}
                        onChangeText={setCashTendered}
                        keyboardType="decimal-pad"
                        placeholder={t('pos.enterCashAmount')}
                      />
                      {cashChange > 0 ? (
                        <BodyText style={styles.changeText}>{`${t('pos.changeLabel', 'Change')}: ${formatAmount(cashChange)}`}</BodyText>
                      ) : null}
                    </View>
                  ) : null}

                  {method === 'MIXED' ? (
                    <View style={styles.methodInputsWrap}>
                      <MetaText>{t('pos.mixedCashPrompt')}</MetaText>
                      <TextInput
                        style={styles.input}
                        value={mixedCashAmount}
                        onChangeText={setMixedCashAmount}
                        keyboardType="decimal-pad"
                        placeholder={t('pos.enterCashAmount')}
                      />
                      <BodyText>{`${t('pos.cardRemainderLabel')}: ${formatAmount(remainingMixedCard)}`}</BodyText>
                    </View>
                  ) : null}

                  <Button
                    title={t('pos.confirmPayment')}
                    onPress={() => void attemptPayment()}
                    disabled={processing || isMixedInvalid || selectedOrderItemIds.length === 0}
                    style={styles.confirmBtn}
                  />
                </Card>
              )}
            </>
          ) : null}
        </ScrollView>
      </ScreenContent>

      <Modal
        visible={terminalProfileMissingVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTerminalProfileMissingVisible(false)}
      >
        <Pressable style={styles.simBackdrop} onPress={() => setTerminalProfileMissingVisible(false)}>
          <Pressable style={styles.configSheet} onPress={(e) => e.stopPropagation()}>
            <TitleText style={styles.configTitle}>{t('pos.cardTerminalProfileMissingTitle')}</TitleText>
            <BodyText style={styles.configText}>
              {t('pos.cardTerminalProfileMissingMessage', {
                terminal: terminalProfileMissingTerminal ?? '-',
              })}
            </BodyText>
            <View style={styles.configActions}>
              <Button
                title={t('common.dismiss')}
                onPress={() => setTerminalProfileMissingVisible(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dev-only simulator modal — only rendered in __DEV__ builds */}
      {__DEV__ ? (
        <Modal
          visible={devSimVisible}
          transparent
          animationType="fade"
          onRequestClose={handleDevSimCancel}
        >
          <Pressable style={styles.simBackdrop} onPress={handleDevSimCancel}>
            <Pressable style={styles.simSheet} onPress={(e) => e.stopPropagation()}>
              <TitleText style={styles.simTitle}>{t('pos.tpvSim.title')}</TitleText>
              <MetaText style={styles.simDescription}>{t('pos.tpvSim.description')}</MetaText>
              {devSimPending ? (
                <BodyText style={styles.simAmount}>
                  {formatAmount(devSimPending.cardAmount)}
                </BodyText>
              ) : null}
              {devSimSnapshot ? (
                <ScrollView style={styles.simSnapshot} horizontal={false}>
                  <MetaText style={styles.simSnapshotText}>
                    {JSON.stringify(devSimSnapshot, null, 2)}
                  </MetaText>
                </ScrollView>
              ) : null}
              <MetaText style={styles.simSectionLabel}>Outcome</MetaText>
              <View style={styles.simRow}>
                {(['approved', 'declined', 'cancelled_by_customer', 'terminal_timeout', 'unknown_result'] as TpvProviderOutcome[]).map((outcome) => (
                  <Pressable
                    key={outcome}
                    style={[styles.simChip, devSimOutcome === outcome && styles.simChipActive]}
                    onPress={() => setDevSimOutcome(outcome)}
                    disabled={devSimProcessing}
                  >
                    <MetaText style={[styles.simChipLabel, devSimOutcome === outcome && styles.simChipLabelActive]}>
                      {t(`pos.tpvOutcomes.${outcome}`)}
                    </MetaText>
                  </Pressable>
                ))}
              </View>
              <MetaText style={styles.simSectionLabel}>Delay</MetaText>
              <View style={styles.simRow}>
                {[0, 3000, 10000].map((delay) => (
                  <Pressable
                    key={delay}
                    style={[styles.simChip, devSimDelayMs === delay && styles.simChipActive]}
                    onPress={() => setDevSimDelayMs(delay)}
                    disabled={devSimProcessing}
                  >
                    <MetaText style={[styles.simChipLabel, devSimDelayMs === delay && styles.simChipLabelActive]}>
                      {delay === 0 ? t('pos.tpvSim.delay.instant') : `${delay / 1000}s`}
                    </MetaText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.simActions}>
                <Button
                  title={t('common.cancel')}
                  onPress={handleDevSimCancel}
                  variant="secondary"
                  disabled={devSimProcessing}
                  style={styles.simActionBtn}
                />
                <Button
                  title={devSimProcessing ? t('common.loading') : t('pos.tpvSim.actions.simulate')}
                  onPress={() => void handleDevSimConfirm()}
                  disabled={devSimProcessing}
                  style={styles.simActionBtn}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </ScreenPage>
  );
}

type CreateSaleConfigurationInput = {
  removedIngredients?: string[];
  selectedExtras?: Array<{ id: string; name: string; unitPriceDelta: number; quantity?: number }>;
  selectedOptions?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionLabel: string;
    priceDelta?: number;
  }>;
};

function parseEuroMajor(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

function parseExtraValue(value: string): { name: string; unitPriceDelta: number } {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*?)\s*\(\+?([\d.,]+)\s*(?:EUR|\u20AC)\)\s*$/i);
  if (match) {
    return { name: match[1].trim(), unitPriceDelta: parseEuroMajor(match[2]) };
  }
  return { name: trimmed, unitPriceDelta: 0 };
}

function parseEuroDeltaFromTrailingParens(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/\(\+?([\d.,]+)\s*(?:EUR|\u20AC)\)/i);
  if (!match) return undefined;
  return parseEuroMajor(match[1]);
}

function parseOrderItemOptionsToConfiguration(
  options: Array<{ name: string; value?: string }> | undefined
): CreateSaleConfigurationInput | undefined {
  if (!options?.length) return undefined;

  const removedIngredients: string[] = [];
  const selectedExtras: NonNullable<CreateSaleConfigurationInput['selectedExtras']> = [];
  const selectedOptions: NonNullable<CreateSaleConfigurationInput['selectedOptions']> = [];

  options.forEach((option, idx) => {
    const name = String(option.name ?? '').trim();
    const rawValue = option.value != null ? String(option.value).trim() : '';
    const lower = name.toLowerCase();

    if (lower === '- remove' || (lower.includes('remove') && lower.startsWith('-'))) {
      if (!rawValue) return;
      removedIngredients.push(
        ...rawValue
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      return;
    }

    if (lower === '+ extra' || (lower.startsWith('+') && lower.includes('extra'))) {
      const parsed = parseExtraValue(rawValue || '');
      selectedExtras.push({
        id: `order_extra_${idx}`,
        name: parsed.name || 'Extra',
        unitPriceDelta: parsed.unitPriceDelta,
        quantity: 1
      });
      return;
    }

    const priceDelta = parseEuroDeltaFromTrailingParens(rawValue);
    const optionLabel =
      priceDelta != null
        ? rawValue.replace(/\s*\(\+?[\d.,]+\s*(?:EUR|\u20AC)\)\s*$/i, '').trim() || rawValue
        : rawValue;
    selectedOptions.push({
      groupId: `order_grp_${idx}`,
      groupName: name || 'Option',
      optionId: `order_opt_${idx}`,
      optionLabel,
      ...(priceDelta != null ? { priceDelta } : {})
    });
  });

  if (!removedIngredients.length && !selectedExtras.length && !selectedOptions.length) {
    return undefined;
  }

  return {
    ...(removedIngredients.length ? { removedIngredients } : {}),
    ...(selectedExtras.length ? { selectedExtras } : {}),
    ...(selectedOptions.length ? { selectedOptions } : {})
  };
}

function toMoney(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: theme.spacing.s3,
    paddingBottom: theme.spacing.s4,
  },
  totalText: {
    marginTop: theme.spacing.s2,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.s2,
    marginBottom: theme.spacing.s1,
  },
  selectAllBtn: {
    color: theme.colors.accentAction,
    marginBottom: 0,
  },
  itemsListWrap: {
    gap: theme.spacing.s2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.s2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.s2,
  },
  itemMain: {
    flex: 1,
  },
  itemRightCol: {
    alignItems: 'flex-end',
    gap: theme.spacing.s1,
  },
  itemName: {
    marginBottom: 0,
  },
  itemNotes: {
    marginTop: theme.spacing.s1,
    marginBottom: 0,
  },
  methodRow: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
  },
  methodBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.s2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgPanel,
  },
  methodBtnActive: {
    borderColor: theme.colors.accentAction,
    backgroundColor: theme.colors.accentAction,
  },
  methodLabel: {
    marginBottom: 0,
    textAlign: 'center',
  },
  methodLabelActive: {
    color: theme.colors.textOnAccent,
  },
  methodInputsWrap: {
    marginTop: theme.spacing.s3,
    gap: theme.spacing.s2
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: theme.colors.accentAction,
    backgroundColor: theme.colors.accentAction,
  },
  checkboxText: {
    marginBottom: 0,
    color: theme.colors.textOnAccent,
    fontWeight: theme.typography.weightSemibold,
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
  confirmBtn: {
    marginTop: theme.spacing.s3,
  },
  changeText: {
    color: theme.colors.accentAction,
    fontWeight: theme.typography.weightSemibold,
    marginBottom: 0,
  },
  simBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.s4,
  },
  simSheet: {
    backgroundColor: theme.colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.s4,
    width: '100%',
    maxWidth: 480,
    gap: theme.spacing.s3,
  },
  simTitle: {
    color: theme.colors.accentAction,
    marginBottom: 0,
  },
  simDescription: {
    marginBottom: 0,
  },
  simAmount: {
    fontWeight: theme.typography.weightSemibold,
    marginBottom: 0,
  },
  simSnapshot: {
    maxHeight: 160,
    backgroundColor: theme.colors.bgPage,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.s2,
  },
  simSnapshotText: {
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 0,
  },
  simSectionLabel: {
    fontWeight: theme.typography.weightSemibold,
    marginBottom: 0,
  },
  simRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
  },
  simChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: theme.spacing.s1,
    backgroundColor: theme.colors.bgPage,
  },
  simChipActive: {
    borderColor: theme.colors.accentAction,
    backgroundColor: theme.colors.accentAction,
  },
  simChipLabel: {
    marginBottom: 0,
  },
  simChipLabelActive: {
    color: theme.colors.textOnAccent,
  },
  simActions: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
    marginTop: theme.spacing.s2,
  },
  simActionBtn: {
    flex: 1,
  },
  configSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.s4,
    gap: theme.spacing.s2,
  },
  configTitle: {
    marginBottom: 0,
  },
  configText: {
    marginBottom: 0,
    color: theme.colors.textSecondary,
  },
  configActions: {
    marginTop: theme.spacing.s2,
  },
  completionWrap: {
    gap: theme.spacing.s2,
    paddingVertical: theme.spacing.s2
  }
});

export function getOrderItemLineTotal(item: RestaurantOrder['items'][number]): number {
  const row = item as unknown as { lineTotal?: unknown; total?: unknown; unitPrice?: unknown; quantity?: unknown };
  const lineTotal = Number(row.lineTotal);
  if (Number.isFinite(lineTotal) && lineTotal > 0) {
    return lineTotal;
  }
  const total = Number(row.total);
  if (Number.isFinite(total) && total > 0) {
    return total;
  }
  const unitPrice = Number(row.unitPrice);
  const quantity = Number(row.quantity ?? item.quantity);
  if (Number.isFinite(unitPrice) && Number.isFinite(quantity) && unitPrice > 0 && quantity > 0) {
    return Math.round((unitPrice * quantity) * 100) / 100;
  }
  return 0;
}

function extractApiErrorMessage(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as {
    message?: unknown;
    error?: { message?: unknown };
    response?: { data?: { message?: unknown; error?: { message?: unknown } } };
  };

  const candidates: unknown[] = [
    e.response?.data?.error?.message,
    e.response?.data?.message,
    e.error?.message,
    e.message,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
    if (Array.isArray(candidate)) {
      const parts = candidate.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
      if (parts.length > 0) return parts.join(' ');
    }
  }

  return null;
}

function normalizeCheckoutErrorMessage(message: string | null, fallback: string): string {
  const normalized = String(message ?? '').trim();
  if (!normalized) return fallback;

  const lower = normalized.toLowerCase();
  const shouldMaskUmbrellaConflict =
    (lower.includes('umbrella sale') && lower.includes('cannot be resumed')) ||
    lower.includes('order already has umbrella sale') ||
    lower.includes('linked pos sale') ||
    lower.includes('open pos umbrella') ||
    lower.includes('cannot resume the linked pos sale');

  const shouldMaskAlreadyPaidReplay =
    lower.includes('cannot complete sale in') && lower.includes('paid') && lower.includes('state');

  if (shouldMaskUmbrellaConflict || shouldMaskAlreadyPaidReplay) {
    return fallback;
  }

  return normalized;
}
