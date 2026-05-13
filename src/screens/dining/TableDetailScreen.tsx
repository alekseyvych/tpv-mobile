import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

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
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  notes?: string;
  isUpdatingStatus?: boolean;
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
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const showOrderCreation = useRef(false);

  const [table, setTable] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItemWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [acquiringLock, setAcquiringLock] = useState(false);

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
        const orderData = await restaurantApi.getOrderById(tableData.currentOrderId);
        setOrder(orderData);
        setSelectedOrder(orderData.id);

        // Map items with UI state
        if (Array.isArray(orderData.items)) {
          setItems(
            orderData.items.map((item: any) => ({
              id: item.id,
              productId: item.productId,
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load table');
    } finally {
      setLoading(false);
    }
  }, [tableId, setSelectedOrder]);

  useEffect(() => {
    (async () => {
      await loadTableAndOrder();
    })();
  }, [loadTableAndOrder]);

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
  }, [order, selectedTerminalId, navigation, tableId]);

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
      <Topbar title={t('dining.tableDetailTitle')} />
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
              subtitle={`${t('dining.capacity')}: ${table.capacity}`}
            />
            <MetaText>{`${t('dining.status')}: ${table.status}`}</MetaText>
            {paymentLocked && (
              <StatusPill
                label={t('dining.paymentLocked')}
                tone="warning"
              />
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
              <BodyText>{t('dining.activeOrder')}</BodyText>
              <MetaText>{order.id}</MetaText>
              {order.partySize && (
                <MetaText>{`${t('dining.partySize')}: ${order.partySize}`}</MetaText>
              )}
            </Card>

            {/* Items List */}
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

                return (
                  <ListItemCard style={styles.itemCard}>
                    <TitleText style={styles.itemTitle}>{item.quantity}x</TitleText>
                    <View style={styles.itemDetails}>
                      {item.notes && <MetaText>{item.notes}</MetaText>}
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
                    </View>
                    {/* Status Progression Button */}
                    {nextStatus && !paymentLocked && (
                      <Button
                        title={t(`dining.${nextStatus}`)}
                        onPress={() => handleUpdateItemStatus(item.id, nextStatus)}
                        variant="secondary"
                        disabled={item.isUpdatingStatus}
                      />
                    )}
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
                title={acquiringLock ? `${t('dining.checkout')}...` : t('dining.checkout')}
                onPress={handleCheckout}
                disabled={!selectedTerminalId || acquiringLock || paymentLocked}
              />
            </View>
          </>
        )}

        {/* Back Button */}
        <Card style={styles.backCard}>
          <Button
            title={t('common.back')}
            onPress={() => navigation.goBack()}
            variant="secondary"
            disabled={loading || acquiringLock}
          />
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  infoCard: { marginBottom: theme.spacing.s3 },
  orderInfoCard: { marginBottom: theme.spacing.s3 },
  itemCard: { marginBottom: theme.spacing.s2, flexDirection: 'row', alignItems: 'center' },
  itemTitle: { width: 40, marginRight: theme.spacing.s2 },
  itemDetails: { flex: 1 },
  buttonContainer: { flexDirection: 'row', gap: theme.spacing.s2, marginBottom: theme.spacing.s3 },
  createButton: { marginTop: theme.spacing.s2 },
  backCard: { marginTop: theme.spacing.s2 }
});
