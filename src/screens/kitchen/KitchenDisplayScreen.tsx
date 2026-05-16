import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

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
  initialStation?: KitchenPrepStation;
};

function getTimingBorderColor(elapsedMinutes: number): string {
  if (elapsedMinutes >= 20) return '#ef4444';
  if (elapsedMinutes >= 10) return '#f59e0b';
  return '#10b981';
}

export function KitchenDisplayScreen({ onBack, initialStation }: Props) {
  const { t } = useTranslation();
  const { items, station, loading, loadKitchenOrders, changeStation, advanceItemStatus } =
    useKitchenOrders();
  const { isPhone } = useDeviceProfile();
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [legendVisible, setLegendVisible] = useState(false);

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
        if (initialStation && initialStation !== station) {
          await changeStation(initialStation);
          return;
        }
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

    const refreshTimer = setInterval(() => {
      void loadKitchenOrders();
    }, 12_000);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [changeStation, initialStation, loadKitchenOrders, station, t]);

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

  // Group items by table for phone view
  const groupedByTable = useMemo(() => {
    const groups: { [tableNumber: string]: KitchenDisplayItem[] } = {};
    items.forEach((item) => {
      if (!groups[item.tableNumber]) {
        groups[item.tableNumber] = [];
      }
      groups[item.tableNumber].push(item);
    });
    return Object.entries(groups)
      .map(([tableNumber, tableItems]) => ({
        tableNumber,
        items: tableItems,
        maxElapsedMinutes: Math.max(...tableItems.map((i) => i.elapsedMinutes)),
      }))
      .sort((a, b) => b.maxElapsedMinutes - a.maxElapsedMinutes);
  }, [items]);

  return (
    <ScreenPage>
      <Topbar
        title={t('kitchen.title')}
        onBack={onBack}
        rightActionLabel={t('common.retry')}
        onRightAction={() => void loadKitchenOrders()}
        rightActionDisabled={loading || processingId !== null}
      />
      <ScreenContent>
        <Card>
          <View style={styles.cardHeaderRow}>
            <TitleText>{t('kitchen.title')}</TitleText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('kitchen.legend.openAria')}
              onPress={() => setLegendVisible(true)}
              style={styles.legendButton}
            >
              <BodyText style={styles.legendButtonText}>i</BodyText>
            </Pressable>
          </View>
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
        </Card>

        <FlatList
          scrollEnabled={isPhone}
          style={isPhone ? styles.list : styles.kanbanBoard}
          data={isPhone ? (groupedByTable as (typeof groupedByTable[number] | string)[]) : (statuses as string[])}
          keyExtractor={(item: typeof groupedByTable[number] | string) => (typeof item === 'string' ? item : `table-${item.tableNumber}`)}
          renderItem={({ item: statusOrTableGroup }: { item: typeof groupedByTable[number] | string }) => {
            if (isPhone) {
              const tableGroup = statusOrTableGroup as typeof groupedByTable[number];
              return (
                <Card style={styles.tableCard}>
                  <TitleText style={styles.tableTitle}>{t('kitchen.table')}: {tableGroup.tableNumber}</TitleText>
                  <MetaText style={styles.tableAgeText}>{t('kitchen.orderAge', { minutes: tableGroup.maxElapsedMinutes })}</MetaText>
                  <View style={styles.tableItemsList}>
                    {tableGroup.items.map((item) => {
                      const next = nextStatus(item.status);
                      const borderColor = getTimingBorderColor(item.elapsedMinutes);
                      return (
                        <View key={item.id} style={[styles.tableItem, { borderLeftColor: borderColor }] }>
                          <MetaText style={styles.itemTitle}>{item.productName}</MetaText>
                          <BodyText style={styles.itemMeta}>{t('kitchen.qty')}: {item.quantity}</BodyText>
                          <BodyText style={styles.itemMeta}>{t('kitchen.statusLabel')}: {t(`kitchen.status.${item.status}`)}</BodyText>
                          <BodyText style={styles.itemMeta}>{formatElapsed(item.elapsedMinutes)}</BodyText>
                          {item.notes ? <BodyText style={styles.itemNotes}>{item.notes}</BodyText> : null}
                          {next ? (
                            <Button
                              title={t('kitchen.advanceTo', { status: t(`kitchen.status.${next}`) })}
                              onPress={() => void handleAdvance(item)}
                              disabled={processingId === item.id}
                              variant="secondary"
                              fullWidth
                              style={styles.itemActionButton}
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </Card>
              );
            } else {
              const status = statusOrTableGroup as string;
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
                      <ListItemCard
                        style={[
                          styles.kanbanCard,
                          { borderLeftWidth: 4, borderLeftColor: getTimingBorderColor(item.elapsedMinutes) },
                        ]}
                      >
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

        <Modal visible={legendVisible} transparent animationType="fade" onRequestClose={() => setLegendVisible(false)}>
          <Pressable style={styles.legendBackdrop} onPress={() => setLegendVisible(false)}>
            <View style={styles.legendSheet}>
              <TitleText style={styles.legendTitle}>{t('kitchen.legend.title')}</TitleText>
              <BodyText style={styles.legendLine}>{t('kitchen.legend.green')}</BodyText>
              <BodyText style={styles.legendLine}>{t('kitchen.legend.yellow')}</BodyText>
              <BodyText style={styles.legendLine}>{t('kitchen.legend.red')}</BodyText>
              <MetaText style={styles.legendFootnote}>{t('kitchen.legend.footnote')}</MetaText>
              <Button
                title={t('common.close')}
                onPress={() => setLegendVisible(false)}
                variant="secondary"
                style={styles.legendCloseButton}
              />
            </View>
          </Pressable>
        </Modal>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s2,
  },
  legendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgPanel,
  },
  legendButtonText: {
    marginBottom: 0,
    fontWeight: theme.typography.weightBold,
  },
  description: { marginBottom: theme.spacing.s3 },
  stationTabs: { flexDirection: 'row', gap: theme.spacing.s2, marginBottom: theme.spacing.s3 },
  stationTabButton: { flex: 1 },
  list: { marginTop: theme.spacing.s3 },
  tableCard: { marginBottom: theme.spacing.s2 },
  tableTitle: { marginBottom: theme.spacing.s1, fontSize: 16 },
  tableAgeText: { color: theme.colors.textSecondary, marginBottom: theme.spacing.s2 },
  tableItemsList: { gap: theme.spacing.s2 },
  tableItem: {
    paddingBottom: theme.spacing.s2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    borderLeftWidth: 4,
    paddingLeft: theme.spacing.s2,
  },
  tableItem_last: { paddingBottom: 0, borderBottomWidth: 0 },
  itemTitle: { marginBottom: 0 },
  itemMeta: { marginBottom: 0, marginTop: theme.spacing.s1 },
  itemNotes: { fontStyle: 'italic', marginBottom: 0, marginTop: theme.spacing.s1 },
  itemPriority: { color: theme.colors.error, marginBottom: 0, marginTop: theme.spacing.s1 },
  itemActions: { marginTop: theme.spacing.s2 },
  itemActionButton: { marginTop: theme.spacing.s2 },
  empty: { textAlign: 'center', marginTop: theme.spacing.s4 },
  error: { marginTop: 0 },
  kanbanBoard: { flexDirection: 'row', gap: theme.spacing.s3 },
  kanbanColumn: { flex: 1, backgroundColor: theme.colors.bgPage, borderRadius: theme.spacing.s2, padding: theme.spacing.s2, maxHeight: 600 },
  columnHeader: { marginBottom: theme.spacing.s2, fontSize: 16, fontWeight: '600' },
  kanbanCard: { marginBottom: theme.spacing.s2 },
  columnEmpty: { textAlign: 'center', marginTop: theme.spacing.s2, fontSize: 12 },
  legendBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    padding: theme.spacing.s3,
  },
  legendSheet: {
    backgroundColor: theme.colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.s4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendTitle: {
    marginBottom: theme.spacing.s2,
  },
  legendLine: {
    marginBottom: theme.spacing.s1,
  },
  legendFootnote: {
    marginTop: theme.spacing.s1,
    marginBottom: theme.spacing.s3,
  },
  legendCloseButton: {
    marginTop: theme.spacing.s2,
  },
});
