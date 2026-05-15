import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListItemCard } from '@/components/ListItemCard';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

import { restaurantApi } from '@/api/restaurant.api';
import { useRestaurantStore } from '@/store/restaurant.store';
import { useTerminalStore } from '@/store/terminal.store';

type OrderItemWithUI = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  notes?: string;
  isUpdatingStatus?: boolean;
  isRemoving?: boolean;
};

type RootStackParamList = {
  Checkout: { source: 'restaurant'; tableId: string; orderId: string };
  OrderCreation: undefined;
};

export function TableDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const selectedTableId = useRestaurantStore((s) => s.selectedTableId);
  const setSelectedOrder = useRestaurantStore((s) => s.setSelectedOrder);
  const selectedGuestCountDraft = useRestaurantStore((s) => s.selectedGuestCountDraft);
  const setSelectedGuestCountDraft = useRestaurantStore((s) => s.setSelectedGuestCountDraft);
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const showOrderCreation = useRef(false);

  const [table, setTable] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItemWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [acquiringLock, setAcquiringLock] = useState(false);
  const [activeOrderExpanded, setActiveOrderExpanded] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [guestPromptVisible, setGuestPromptVisible] = useState(false);
  const [savingGuestCount, setSavingGuestCount] = useState(false);
  const currentOrderId = order?.id ?? null;
  const isLockedByThisTerminal =
    Boolean(order?.paymentLockedByTerminalId) &&
    Boolean(selectedTerminalId) &&
    order?.paymentLockedByTerminalId === selectedTerminalId;

  const statusToneForTable = useCallback(
    (status: string): 'success' | 'warning' | 'error' | 'info' => {
      if (status === 'available') return 'success';
      if (status === 'reserved') return 'warning';
      if (status === 'occupied') return 'error';
      return 'info';
    },
    [],
  );

  // Use selected table ID from store, or go back if not set
  const tableId = selectedTableId;
  useEffect(() => {
    if (!tableId) {
      navigation.goBack();
    }
  }, [tableId, navigation]);

  /**
   * Load table and current order
   */
  const loadTableAndOrder = useCallback(async () => {
    if (!tableId) return;

    try {
      setLoading(true);
      setError(null);

      // Load table
      const tableData = await restaurantApi.getTableById(tableId);
      setTable(tableData);

      // Load current order if exists
      if (tableData.currentOrderId) {
        let orderData = await restaurantApi.getOrderById(tableData.currentOrderId);

        // Auto-clean stale lock if it belongs to this terminal and there is no open POS sale resume.
        if (
          orderData.paymentLockedByTerminalId &&
          selectedTerminalId &&
          orderData.paymentLockedByTerminalId === selectedTerminalId
        ) {
          try {
            const resume = await restaurantApi.getOpenPosSaleResume(orderData.id);
            if (!resume?.saleId) {
              orderData = await restaurantApi.releaseOrderPaymentLock(orderData.id, selectedTerminalId);
            }
          } catch {
            // Ignore auto-release failures; UI will still show locked state and allow resume checkout.
          }
        }

        setOrder(orderData);
        setSelectedOrder(orderData.id);
        if (typeof orderData.partySize === 'number' && orderData.partySize > 0) {
          setGuestCount(orderData.partySize);
          setSelectedGuestCountDraft(orderData.partySize);
        }
        setGuestPromptVisible(false);

        // Map items with UI state
        if (Array.isArray(orderData.items)) {
          setItems(
            orderData.items.map((item: any) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName || t('dining.item'),
              quantity: item.quantity,
              status: item.status || 'pending',
              notes: item.notes
            }))
          );
        }

        // Check if payment is locked
        setPaymentLocked(!!orderData.paymentLockedByTerminalId);
      } else {
        setOrder(null);
        setSelectedOrder(null);
        setItems([]);
        setPaymentLocked(false);
        setActiveOrderExpanded(false);
        const defaultGuests = Math.max(
          1,
          Math.min(tableData.capacity ?? 99, selectedGuestCountDraft ?? tableData.currentGuestCount ?? 1),
        );
        setGuestCount(defaultGuests);
        setGuestPromptVisible(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load table');
    } finally {
      setLoading(false);
    }
  }, [tableId, setSelectedOrder, selectedGuestCountDraft, setSelectedGuestCountDraft, selectedTerminalId, t]);

  const adjustGuestCount = useCallback((delta: number) => {
    const capacity = Math.max(1, table?.capacity ?? 99);
    setGuestCount((prev) => Math.max(1, Math.min(capacity, prev + delta)));
  }, [table?.capacity]);

  const handleSaveGuestCount = useCallback(async () => {
    try {
      setSavingGuestCount(true);
      setError(null);

      if (currentOrderId) {
        const updatedOrder = await restaurantApi.updateOrder(currentOrderId, { partySize: guestCount });
        setOrder(updatedOrder);
      }

      setSelectedGuestCountDraft(guestCount);
      setGuestPromptVisible(false);
      await loadTableAndOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update guest count');
    } finally {
      setSavingGuestCount(false);
    }
  }, [guestCount, currentOrderId, loadTableAndOrder, setSelectedGuestCountDraft]);

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (!currentOrderId || paymentLocked) return;

      try {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isRemoving: true } : item,
          ),
        );
        await restaurantApi.removeOrderItem(currentOrderId, itemId);
        await loadTableAndOrder();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove item');
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isRemoving: false } : item,
          ),
        );
      }
    },
    [currentOrderId, loadTableAndOrder, paymentLocked],
  );

  const handleUpdateItem = useCallback(
    async (itemId: string, nextQuantity: number) => {
      if (!currentOrderId || paymentLocked) return;
      if (nextQuantity <= 0) {
        await handleRemoveItem(itemId);
        return;
      }

      try {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isUpdatingStatus: true } : item,
          ),
        );
        await restaurantApi.updateOrderItem(currentOrderId, itemId, { quantity: nextQuantity });
        await loadTableAndOrder();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update item');
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isUpdatingStatus: false } : item,
          ),
        );
      }
    },
    [currentOrderId, handleRemoveItem, loadTableAndOrder, paymentLocked],
  );

  useEffect(() => {
    (async () => {
      await loadTableAndOrder();
    })();
  }, [loadTableAndOrder]);

  useFocusEffect(
    useCallback(() => {
      void loadTableAndOrder();
      return undefined;
    }, [loadTableAndOrder]),
  );

  /**
   * Update item status
   */
  const handleUpdateItemStatus = useCallback(
    async (itemId: string, newStatus: 'preparing' | 'ready' | 'served') => {
      if (!order?.id) return;

      try {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isUpdatingStatus: true } : item
          )
        );

        await restaurantApi.updateOrderItemStatus(order.id, itemId, newStatus);

        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: newStatus, isUpdatingStatus: false }
              : item
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update item');
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isUpdatingStatus: false } : item
          )
        );
      }
    },
    [order]
  );

  /**
   * Acquire payment lock and go to checkout
   */
  const handleCheckout = useCallback(async () => {
    if (!order?.id || !selectedTerminalId || !tableId) return;

    if (paymentLocked) {
      if (!isLockedByThisTerminal) {
        setError(t('dining.paymentLockedByOtherTerminal'));
        return;
      }

      navigation.navigate('Checkout', {
        source: 'restaurant',
        tableId,
        orderId: order.id,
      });
      return;
    }

    try {
      setAcquiringLock(true);
      setError(null);

      // Acquire payment lock
      const lockedOrder = await restaurantApi.acquireOrderPaymentLock(
        order.id,
        selectedTerminalId
      );

      setPaymentLocked(true);
      setOrder(lockedOrder);

      // Navigate with explicit restaurant handoff context.
      navigation.navigate('Checkout', {
        source: 'restaurant',
        tableId,
        orderId: order.id
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acquire payment lock');
    } finally {
      setAcquiringLock(false);
    }
  }, [order, selectedTerminalId, tableId, paymentLocked, isLockedByThisTerminal, navigation, t]);

  if (loading) {
    return (
      <ScreenPage>
        <Topbar title={t('dining.tableDetailTitle')} />
        <ScreenContent>
          <Card>
            <LoadingState
              title={t('dining.loadingTitle')}
              description={t('dining.loadingDescription')}
            />
          </Card>
        </ScreenContent>
      </ScreenPage>
    );
  }

  return (
    <ScreenPage>
      <Topbar title={t('dining.tableDetailTitle')} onBack={() => navigation.goBack()} />
      <ScreenContent>
        {error && (
          <Card>
            <ErrorState
              title={t('dining.errorTitle')}
              description={error}
              actionLabel={t('common.dismiss')}
              onAction={() => setError(null)}
            />
          </Card>
        )}

        {/* Table Info */}
        {table && (
          <Card style={styles.infoCard}>
            <SectionHeader
              title={`${t('dining.table')} ${table.number}`}
              subtitle={undefined}
            />
            <View style={styles.tableMetaCompactRow}>
              <StatusPill label={table.status} tone={statusToneForTable(table.status)} />
              <View style={styles.guestCompactWrap}>
                <MetaText style={styles.guestCompactLabel}>{t('dining.partySize', 'Guests')}</MetaText>
                <Pressable
                  onPress={() => {
                    setGuestPromptVisible((v) => !v);
                  }}
                >
                  <TitleText style={styles.guestCompactCurrent}>{String(guestCount)}</TitleText>
                </Pressable>
                <MetaText style={styles.guestCompactDivider}>/{String(table.capacity ?? 0)}</MetaText>
              </View>
            </View>

            {guestPromptVisible && (
              <View style={styles.guestInlineEditorRow}>
                <Pressable style={styles.miniStepBtn} onPress={() => adjustGuestCount(-1)}>
                  <MetaText style={styles.miniStepBtnText}>-</MetaText>
                </Pressable>
                <TitleText style={styles.guestEditorValue}>{String(guestCount)}</TitleText>
                <Pressable style={styles.miniStepBtn} onPress={() => adjustGuestCount(1)}>
                  <MetaText style={styles.miniStepBtnText}>+</MetaText>
                </Pressable>
                <Pressable
                  style={[styles.miniStepBtn, styles.miniStepBtnConfirm]}
                  onPress={() => {
                    void handleSaveGuestCount();
                  }}
                  disabled={savingGuestCount}
                >
                  <MetaText style={styles.miniStepBtnText}>{savingGuestCount ? '...' : 'ok'}</MetaText>
                </Pressable>
              </View>
            )}

            {paymentLocked && (
              <>
                <StatusPill
                  label={t('dining.paymentLocked')}
                  tone="warning"
                />
                {isLockedByThisTerminal ? (
                  <View style={styles.paymentLockActions}>
                    <Button
                      title={t('dining.resumeCheckout')}
                      onPress={() => {
                        void handleCheckout();
                      }}
                      disabled={acquiringLock}
                    />
                  </View>
                ) : null}
              </>
            )}
          </Card>
        )}

        {/* No Order */}
        {!order ? (
          <Card>
            <EmptyState
              title={t('dining.noActiveOrder')}
              description={t('dining.createNewOrder')}
            />
            <Button
              title={t('dining.createOrder')}
              onPress={() => {
                setSelectedGuestCountDraft(guestCount);
                showOrderCreation.current = true;
                navigation.navigate('OrderCreation');
              }}
              style={styles.createButton}
            />
          </Card>
        ) : (
          /* Order Items */
          <>
            <Card style={styles.orderInfoCard}>
              <Pressable
                style={styles.activeOrderHeader}
                onPress={() => setActiveOrderExpanded((prev) => !prev)}
              >
                <View style={styles.activeOrderHeaderTextWrap}>
                  <BodyText style={styles.activeOrderTitle}>{t('dining.activeOrder')}</BodyText>
                  <MetaText style={styles.activeOrderSummaryText}>
                    {`${items.length} ${t('dining.items')}${order.partySize ? ` • ${t('dining.partySize')}: ${order.partySize}` : ''}`}
                  </MetaText>
                </View>
                <MetaText style={styles.activeOrderChevron}>{activeOrderExpanded ? '▾' : '▸'}</MetaText>
              </Pressable>
              {activeOrderExpanded && (
                <>
                  <MetaText>{t('dining.orderExpandedHint', 'Items and actions')}</MetaText>
                </>
              )}
            </Card>

            {/* Items List */}
            {activeOrderExpanded && (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const nextStatus =
                    item.status === 'pending'
                      ? 'preparing'
                      : item.status === 'preparing'
                        ? 'ready'
                        : item.status === 'ready'
                          ? 'served'
                          : undefined;
                  const nextStatusLabel =
                    nextStatus === 'preparing'
                      ? t('dining.preparingShort', 'prep')
                      : nextStatus === 'ready'
                        ? t('dining.readyShort', 'ready')
                        : nextStatus === 'served'
                          ? t('dining.servedShort', 'served')
                          : null;

                  return (
                    <ListItemCard style={styles.itemCard}>
                      <View style={styles.itemMainRow}>
                        <BodyText style={styles.itemPrimaryText} numberOfLines={1}>
                          {`${item.quantity}x ${item.productName}`}
                        </BodyText>
                        <StatusPill
                          label={item.status}
                          tone={
                            item.status === 'pending'
                              ? 'info'
                              : item.status === 'preparing'
                                ? 'warning'
                                : item.status === 'ready'
                                  ? 'success'
                                  : 'neutral'
                          }
                        />
                        <View style={styles.itemActionsRow}>
                          {nextStatus && !paymentLocked && nextStatusLabel && (
                            <Pressable
                              style={[styles.iconActionBtn, styles.progressActionBtn]}
                              onPress={() => handleUpdateItemStatus(item.id, nextStatus)}
                              disabled={item.isUpdatingStatus || item.isRemoving}
                            >
                              <MetaText style={styles.iconActionText}>{nextStatusLabel}</MetaText>
                            </Pressable>
                          )}
                          {!paymentLocked && item.quantity > 1 && (
                            <Pressable
                              style={styles.iconActionBtn}
                              onPress={() => handleUpdateItem(item.id, item.quantity - 1)}
                              disabled={item.isUpdatingStatus || item.isRemoving}
                            >
                              <MetaText style={styles.iconActionText}>-</MetaText>
                            </Pressable>
                          )}
                          {!paymentLocked && (
                            <Pressable
                              style={[styles.iconActionBtn, styles.removeActionBtn]}
                              onPress={() => {
                                void handleRemoveItem(item.id);
                              }}
                              disabled={item.isUpdatingStatus || item.isRemoving}
                            >
                              <MetaText style={styles.iconActionText}>x</MetaText>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </ListItemCard>
                  );
                }}
                ListEmptyComponent={
                  <EmptyState
                    title={t('dining.noItems')}
                    description={t('dining.noOrderItems')}
                  />
                }
              />
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                title={t('dining.addItems')}
                onPress={() => {
                  showOrderCreation.current = true;
                  navigation.navigate('OrderCreation');
                }}
                disabled={paymentLocked || acquiringLock}
              />
              <Button
                title={
                  acquiringLock
                    ? `${t('dining.checkout')}...`
                    : paymentLocked && isLockedByThisTerminal
                      ? t('dining.resumeCheckout')
                      : t('dining.checkout')
                }
                onPress={handleCheckout}
                disabled={!selectedTerminalId || acquiringLock || (paymentLocked && !isLockedByThisTerminal)}
              />
            </View>
          </>
        )}

      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  infoCard: { marginBottom: theme.spacing.s3 },
  tableMetaCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s2,
  },
  guestCompactWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  guestCompactLabel: { marginBottom: 0 },
  guestCompactCurrent: {
    marginBottom: 0,
    textDecorationLine: 'underline',
    minWidth: 16,
    textAlign: 'center',
  },
  guestCompactDivider: { marginBottom: 0 },
  guestInlineEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.s2,
  },
  miniStepBtn: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgPage,
    paddingHorizontal: 8,
  },
  miniStepBtnConfirm: {
    borderColor: '#16A34A',
  },
  miniStepBtnText: { marginBottom: 0, fontWeight: theme.typography.weightSemibold },
  guestEditorValue: { minWidth: 20, textAlign: 'center', marginBottom: 0 },
  orderInfoCard: { marginBottom: theme.spacing.s3 },
  activeOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeOrderHeaderTextWrap: { flex: 1, marginRight: theme.spacing.s2 },
  activeOrderTitle: { marginBottom: 0 },
  activeOrderSummaryText: { marginBottom: 0 },
  activeOrderChevron: { marginBottom: 0, fontSize: theme.typography.sizeLg },
  itemCard: {
    marginBottom: theme.spacing.s2,
    paddingVertical: theme.spacing.s1,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s1,
  },
  itemPrimaryText: {
    flex: 1,
    marginBottom: 0,
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgPage,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
  },
  progressActionBtn: {
    minWidth: 46,
  },
  removeActionBtn: {
    borderColor: '#DC2626',
  },
  iconActionText: {
    marginBottom: 0,
    fontWeight: theme.typography.weightSemibold,
  },
  buttonContainer: { flexDirection: 'row', gap: theme.spacing.s2, marginBottom: theme.spacing.s3 },
  paymentLockActions: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s2 },
  createButton: { marginTop: theme.spacing.s2 },
  backCard: { marginTop: theme.spacing.s2 }
});
