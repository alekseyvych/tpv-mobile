import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import type { KitchenPrepStation } from '@/api/kitchen.api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListItemCard } from '@/components/ListItemCard';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useKitchenOrders, type KitchenDisplayItem } from '@/hooks/useKitchenOrders';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  onBack: () => void;
};

export function KitchenDisplayScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const { items, station, loading, loadKitchenOrders, changeStation, advanceItemStatus } =
    useKitchenOrders();
  const { isPhone } = useDeviceProfile();
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  function nextStatus(status: KitchenDisplayItem['status']): KitchenDisplayItem['status'] | null {
    if (status === 'pending') return 'preparing';
    if (status === 'preparing') return 'ready';
    if (status === 'ready') return 'served';
    return null;
  }

  function isPermissionError(cause: unknown): boolean {
    if (!cause || typeof cause !== 'object') return false;
    const candidate = cause as { response?: { status?: number } };
    return candidate.response?.status === 401 || candidate.response?.status === 403;
  }

  function formatElapsed(elapsedMinutes: number): string {
    return t('kitchen.elapsedMinutes', { minutes: elapsedMinutes });
  }

  function priorityFromElapsed(elapsedMinutes: number): 'normal' | 'high' | 'rush' {
    if (elapsedMinutes >= 20) return 'rush';
    if (elapsedMinutes >= 10) return 'high';
    return 'normal';
  }

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        await loadKitchenOrders();
      } catch (cause) {
        setError(
          isPermissionError(cause)
            ? t('kitchen.permissionError')
            : t('kitchen.loadError') || 'Failed to load items'
        );
      }
    }
    void load();
  }, [loadKitchenOrders, t]);

  const handleAdvance = async (item: KitchenDisplayItem) => {
    if (processingId) return;
    const next = nextStatus(item.status);
    if (!next) return;

    setProcessingId(item.id);
    setError(null);
    try {
      await advanceItemStatus(item);
    } catch (cause) {
      setError(
        isPermissionError(cause)
          ? t('kitchen.permissionError')
          : t('kitchen.markReadyError') || 'Failed to update kitchen item status'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const stationTabs: { id: KitchenPrepStation; label: string }[] = [
    { id: 'kitchen', label: t('kitchen.stations.kitchen') },
    { id: 'bar', label: t('kitchen.stations.bar') },
    { id: 'all', label: t('kitchen.stations.all') },
  ];

  const statuses: KitchenDisplayItem['status'][] = ['pending', 'preparing', 'ready', 'served'];

  const onStationChange = async (nextStation: KitchenPrepStation) => {
    try {
      setError(null);
      await changeStation(nextStation);
    } catch (cause) {
      setError(
        isPermissionError(cause)
          ? t('kitchen.permissionError')
          : t('kitchen.loadError') || 'Failed to load items'
      );
    }
  };

  return (
    <ScreenPage>
      <Topbar title={t('kitchen.title')} />
      <ScreenContent>
        <Card>
          <TitleText>{t('kitchen.title')}</TitleText>
          <BodyText style={styles.description}>{loading ? t('common.loading') : t('kitchen.description')}</BodyText>
          {error ? <ErrorText style={styles.error}>{error}</ErrorText> : null}
          <View style={styles.stationTabs}>
            {stationTabs.map((tab) => (
              <Button
                key={tab.id}
                title={tab.label}
                onPress={() => void onStationChange(tab.id)}
                disabled={loading || processingId !== null}
                variant={station === tab.id ? 'primary' : 'secondary'}
                style={styles.stationTabButton}
              />
            ))}
          </View>
          <View style={styles.row}>
            <Button title={t('common.back')} onPress={onBack} disabled={loading || processingId !== null} variant="secondary" />
            <Button title={t('common.retry')} onPress={() => void loadKitchenOrders()} disabled={loading || processingId !== null} variant="secondary" />
          </View>
        </Card>

        <FlatList
          scrollEnabled={isPhone}
          style={isPhone ? styles.list : styles.kanbanBoard}
          data={isPhone ? (items as (KitchenDisplayItem | string)[]) : (statuses as (KitchenDisplayItem | string)[])}
          keyExtractor={(item: KitchenDisplayItem | string) => (typeof item === 'string' ? item : item.id)}
          renderItem={({ item: statusOrItem }: { item: KitchenDisplayItem | string }) => {
            if (isPhone) {
              const item = statusOrItem as KitchenDisplayItem;
              const next = nextStatus(item.status);
              return (
                <ListItemCard>
                  <MetaText style={styles.itemTitle}>{item.productName}</MetaText>
                  <BodyText style={styles.itemMeta}>{t('kitchen.tableQty', { table: item.tableNumber, qty: item.quantity })}</BodyText>
                  <BodyText style={styles.itemMeta}>{t('kitchen.statusLabel')}: {t(`kitchen.status.${item.status}`)}</BodyText>
                  <BodyText style={styles.itemMeta}>{formatElapsed(item.elapsedMinutes)}</BodyText>
                  {item.notes ? <BodyText style={styles.itemNotes}>{item.notes}</BodyText> : null}
                  <MetaText style={styles.itemPriority}>{t('kitchen.priorityLabel', { priority: t(`kitchen.priority.${priorityFromElapsed(item.elapsedMinutes)}`) })}</MetaText>
                  <View style={styles.itemActions}>
                    {next ? (
                      <Button
                        title={t('kitchen.advanceTo', { status: t(`kitchen.status.${next}`) })}
                        onPress={() => void handleAdvance(item)}
                        disabled={processingId === item.id}
                        variant="secondary"
                        fullWidth
                      />
                    ) : null}
                  </View>
                </ListItemCard>
              );
            } else {
              const status = statusOrItem as string;
              const columnItems = items.filter((i) => i.status === status);
              const typedStatus = status as KitchenDisplayItem['status'];
              const statusLabel = t(`kitchen.status.${typedStatus}`);
              const next = nextStatus(typedStatus);
              return (
                <View style={styles.kanbanColumn}>
                  <TitleText style={styles.columnHeader}>{statusLabel}</TitleText>
                  <FlatList
                    scrollEnabled={true}
                    data={columnItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <ListItemCard style={styles.kanbanCard}>
                        <MetaText style={styles.itemTitle}>{item.productName}</MetaText>
                        <BodyText style={styles.itemMeta}>{t('kitchen.tableQty', { table: item.tableNumber, qty: item.quantity })}</BodyText>
                        <BodyText style={styles.itemMeta}>{formatElapsed(item.elapsedMinutes)}</BodyText>
                        {item.notes ? <BodyText style={styles.itemNotes}>{item.notes}</BodyText> : null}
                        <MetaText style={styles.itemPriority}>{t('kitchen.priorityLabel', { priority: t(`kitchen.priority.${priorityFromElapsed(item.elapsedMinutes)}`) })}</MetaText>
                        <View style={styles.itemActions}>
                          {next ? (
                            <Button
                              title={t('kitchen.advanceTo', { status: t(`kitchen.status.${next}`) })}
                              onPress={() => void handleAdvance(item)}
                              disabled={processingId === item.id}
                              variant="secondary"
                              fullWidth
                            />
                          ) : null}
                        </View>
                      </ListItemCard>
                    )}
                    ListEmptyComponent={<BodyText style={styles.columnEmpty}>{t('kitchen.noItemsByStatus', { status: statusLabel })}</BodyText>}
                  />
                </View>
              );
            }
          }}
          ListEmptyComponent={isPhone ? <BodyText style={styles.empty}>{t('kitchen.noItems')}</BodyText> : undefined}
        />
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s3 },
  stationTabs: { flexDirection: 'row', gap: theme.spacing.s2, marginBottom: theme.spacing.s3 },
  stationTabButton: { flex: 1 },
  row: { flexDirection: 'row', gap: theme.spacing.s2 },
  list: { marginTop: theme.spacing.s3 },
  itemTitle: { marginBottom: 0 },
  itemMeta: { marginBottom: 0, marginTop: theme.spacing.s1 },
  itemNotes: { fontStyle: 'italic', marginBottom: 0, marginTop: theme.spacing.s1 },
  itemPriority: { color: theme.colors.error, marginBottom: 0, marginTop: theme.spacing.s1 },
  itemActions: { marginTop: theme.spacing.s2 },
  empty: { textAlign: 'center', marginTop: theme.spacing.s4 },
  error: { marginTop: 0 },
  kanbanBoard: { flexDirection: 'row', gap: theme.spacing.s3 },
  kanbanColumn: { flex: 1, backgroundColor: theme.colors.bgPage, borderRadius: theme.spacing.s2, padding: theme.spacing.s2, maxHeight: 600 },
  columnHeader: { marginBottom: theme.spacing.s2, fontSize: 16, fontWeight: '600' },
  kanbanCard: { marginBottom: theme.spacing.s2 },
  columnEmpty: { textAlign: 'center', marginTop: theme.spacing.s2, fontSize: 12 },
});
