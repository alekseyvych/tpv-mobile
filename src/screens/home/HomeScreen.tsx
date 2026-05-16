import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getActiveCashShift } from '@/api/cashShifts.api';
import { getKitchenOrders } from '@/api/kitchen.api';
import { restaurantApi } from '@/api/restaurant.api';
import { getTerminal } from '@/api/terminals.api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useAuthStore } from '@/store/auth.store';
import { useTerminalStore } from '@/store/terminal.store';
import { useWaiterHomeStore } from '@/store/waiter-home.store';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  onGoDining: () => void;
  onGoDiningFloor: () => void;
  onGoKitchen: () => void;
  onGoBar: () => void;
  onGoPos: () => void;
  onGoAppointments: () => void;
  onGoSettings: () => void;
  onSelectTerminal: () => void;
  onOpenShift: () => void;
  onOpenTableContext: (tableId: string, orderId?: string) => void;
  isOnline: boolean;
  isSyncing: boolean;
  onSyncNow: () => void;
};

type ShiftStatus = 'loading' | 'open' | 'closed' | 'unavailable';

type ReadyTicket = {
  id: string;
  orderId: string;
  tableId: string | null;
  tableNumber: string;
  productName: string;
  elapsedLabel: string;
};

type ResumePreview = {
  tableId: string;
  orderId: string | null;
  tableNumber: string;
};

type TableSearchResult = {
  id: string;
  number: string;
  currentOrderId: string | null;
};

function hasKeyword(values: string[], keywords: string[]): boolean {
  return values.some((value) => keywords.some((keyword) => value.includes(keyword)));
}

function toSafeErrorStatus(error: unknown): number | null {
  const fromStatus = (error as { status?: number } | undefined)?.status;
  if (typeof fromStatus === 'number') return fromStatus;
  const fromResponse = (error as { response?: { status?: number } } | undefined)?.response?.status;
  return typeof fromResponse === 'number' ? fromResponse : null;
}

function minutesSince(isoDate?: string): string {
  if (!isoDate) return '0m';
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 60000)) : 0;
  return `${mins}m`;
}

export function HomeScreen({
  onGoDining,
  onGoDiningFloor,
  onGoKitchen,
  onGoBar,
  onGoPos,
  onGoAppointments,
  onGoSettings,
  onSelectTerminal,
  onOpenShift,
  onOpenTableContext,
  isOnline,
  isSyncing,
  onSyncNow,
}: Props) {
  const { t } = useTranslation();
  const { isPhone } = useDeviceProfile();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles ?? []);
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const activeCashShiftId = useTerminalStore((s) => s.activeCashShiftId);
  const resumeContext = useWaiterHomeStore((s) => s.context);
  const clearResumeContext = useWaiterHomeStore((s) => s.clearResumeContext);

  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>('loading');
  const [terminalName, setTerminalName] = useState<string | null>(null);
  const [resumePreview, setResumePreview] = useState<ResumePreview | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [readyError, setReadyError] = useState<string | null>(null);
  const [readyTickets, setReadyTickets] = useState<ReadyTicket[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TableSearchResult[]>([]);

  const roleValues = useMemo(() => roles.map((role) => String(role).toLowerCase()), [roles]);
  const permissionValues = useMemo(
    () => permissions.map((permission) => String(permission).toLowerCase()),
    [permissions],
  );

  const canAccessDining = useMemo(() => {
    return (
      hasKeyword(roleValues, ['waiter', 'manager', 'admin']) ||
      hasKeyword(permissionValues, ['dining', 'restaurant', 'table', 'order'])
    );
  }, [roleValues, permissionValues]);

  const canAccessKitchen = useMemo(() => {
    return (
      hasKeyword(roleValues, ['waiter', 'manager', 'admin']) ||
      hasKeyword(permissionValues, ['kitchen', 'bar'])
    );
  }, [roleValues, permissionValues]);

  const canAccessAppointments = useMemo(() => {
    return (
      hasKeyword(roleValues, ['manager', 'admin']) ||
      hasKeyword(permissionValues, ['appointment'])
    );
  }, [roleValues, permissionValues]);

  const refreshShiftStatus = useCallback(async () => {
    if (!selectedTerminalId) {
      setShiftStatus('unavailable');
      setTerminalName(null);
      return;
    }

    setShiftStatus('loading');
    try {
      const terminal = await getTerminal(selectedTerminalId);
      setTerminalName(terminal.name || terminal.terminalId || selectedTerminalId);

      if (activeCashShiftId) {
        setShiftStatus('open');
        return;
      }
      const activeShift = await getActiveCashShift(selectedTerminalId);
      setShiftStatus(activeShift?.id ? 'open' : 'closed');
    } catch {
      setTerminalName(selectedTerminalId);
      setShiftStatus('unavailable');
    }
  }, [activeCashShiftId, selectedTerminalId]);

  const refreshResumePreview = useCallback(async () => {
    const contextTableId = resumeContext.lastTableId;
    if (!contextTableId) {
      setResumePreview(null);
      return;
    }

    if (resumeContext.terminalId && selectedTerminalId && resumeContext.terminalId !== selectedTerminalId) {
      clearResumeContext();
      setResumePreview(null);
      return;
    }

    setResumeLoading(true);
    try {
      const table = await restaurantApi.getTableById(contextTableId);
      let orderId = resumeContext.lastOrderId;

      if (orderId) {
        try {
          await restaurantApi.getOrderById(orderId);
        } catch {
          orderId = table.currentOrderId ?? null;
        }
      } else {
        orderId = table.currentOrderId ?? null;
      }

      setResumePreview({
        tableId: table.id,
        orderId,
        tableNumber: table.number,
      });
    } catch {
      clearResumeContext();
      setResumePreview(null);
    } finally {
      setResumeLoading(false);
    }
  }, [clearResumeContext, resumeContext.lastOrderId, resumeContext.lastTableId, resumeContext.terminalId, selectedTerminalId]);

  const refreshReadyTickets = useCallback(async () => {
    if (!canAccessKitchen) {
      setReadyTickets([]);
      setReadyError(null);
      return;
    }

    setReadyLoading(true);
    setReadyError(null);
    try {
      const response = await getKitchenOrders('all');
      const items = response.data
        .flatMap((order) =>
          order.items
            .filter((item) => item.status === 'ready')
            .map<ReadyTicket>((item) => ({
              id: item.id,
              orderId: order.id,
              tableId: order.tableId ?? null,
              tableNumber: order.tableNumber ?? '-',
              productName: item.productName,
              elapsedLabel: minutesSince(item.createdAt),
            })),
        )
        .slice(0, 6);
      setReadyTickets(items);
    } catch (error) {
      const status = toSafeErrorStatus(error);
      if (status === 401 || status === 403) {
        setReadyError(t('home.readyToServe.permissionDenied'));
      } else {
        setReadyError(t('home.readyToServe.loadError'));
      }
    } finally {
      setReadyLoading(false);
    }
  }, [canAccessKitchen, t]);

  const searchTables = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || !canAccessDining) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await restaurantApi.getTables({ search: trimmed });
        setSearchResults(
          response.data.slice(0, 6).map((table) => ({
            id: table.id,
            number: table.number,
            currentOrderId: table.currentOrderId ?? null,
          })),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [canAccessDining],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshShiftStatus();
      void refreshResumePreview();
      void refreshReadyTickets();
      void searchTables(tableSearch);

      const pollId = setInterval(() => {
        void refreshReadyTickets();
      }, 15000);

      return () => {
        clearInterval(pollId);
      };
    }, [refreshReadyTickets, refreshResumePreview, refreshShiftStatus, searchTables, tableSearch]),
  );

  const quickShortcuts = useMemo(
    () => [
      { key: 'pos', label: t('pos.navTitle'), onPress: onGoPos, visible: true },
      { key: 'dining', label: t('dining.floorNav'), onPress: onGoDiningFloor, visible: canAccessDining },
      { key: 'kitchen', label: t('kitchen.navTitle'), onPress: onGoKitchen, visible: canAccessKitchen },
      { key: 'bar', label: t('kitchen.stations.bar'), onPress: onGoBar, visible: canAccessKitchen },
      { key: 'appointments', label: t('appointments.navTitle'), onPress: onGoAppointments, visible: canAccessAppointments },
      { key: 'settings', label: t('common.settings'), onPress: onGoSettings, visible: true },
    ].filter((item) => item.visible),
    [canAccessAppointments, canAccessDining, canAccessKitchen, onGoAppointments, onGoBar, onGoDiningFloor, onGoKitchen, onGoPos, onGoSettings, t],
  );

  return (
    <ScreenPage>
      <Topbar title={t('common.home')} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: theme.spacing.s4 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.readinessHeader}>
            <TitleText style={styles.statusTitle}>{t('home.readiness.title')}</TitleText>
            <StatusPill
              label={shiftStatus === 'open' ? t('home.readiness.shiftOpen') : t('home.readiness.shiftClosed')}
              tone={shiftStatus === 'open' ? 'success' : 'warning'}
            />
          </View>
          <MetaText style={styles.readinessIdentity}>
            {(user?.firstName ?? user?.email ?? 'User')} · {(roles[0] ?? t('home.readiness.roleUnknown')).toString()}
          </MetaText>
          <MetaText style={styles.readinessIdentity}>
            {selectedTerminalId
              ? `${t('home.readiness.terminal')}: ${terminalName ?? selectedTerminalId}`
              : t('home.readiness.noTerminal')}
          </MetaText>
          {!isOnline ? (
            <BodyText style={styles.offlineText}>{t('home.sync.offlineDescription')}</BodyText>
          ) : null}
          {!selectedTerminalId ? (
            <Button title={t('home.readiness.selectTerminal')} onPress={onSelectTerminal} />
          ) : shiftStatus === 'closed' ? (
            <Button title={t('home.readiness.openShift')} onPress={onOpenShift} />
          ) : (
            <Button title={isSyncing ? t('sync.syncing') : t('sync.syncNow')} onPress={onSyncNow} />
          )}
        </Card>

        <Card>
          <SectionHeader title={t('home.primary.title')} />
          <TitleText style={styles.primaryTitle}>{t('home.primary.openDiningFloor')}</TitleText>
          <BodyText style={styles.primaryDescription}>{t('home.primary.openDiningFloorDescription')}</BodyText>
          <Button
            title={t('home.primary.openDiningFloor')}
            onPress={onGoDining}
            disabled={!canAccessDining || !selectedTerminalId || shiftStatus !== 'open'}
          />
        </Card>

        <Card>
          <SectionHeader title={t('home.resume.title')} />
          {resumeLoading ? (
            <LoadingState title={t('home.resume.loadingTitle')} />
          ) : resumePreview ? (
            <Pressable
              style={styles.resumeCard}
              onPress={() => onOpenTableContext(resumePreview.tableId, resumePreview.orderId ?? undefined)}
            >
              <TitleText style={styles.resumeTitle}>{t('home.resume.tableLabel', { table: resumePreview.tableNumber })}</TitleText>
              <MetaText>
                {resumePreview.orderId
                  ? t('home.resume.orderLabel', { orderId: resumePreview.orderId })
                  : t('home.resume.noOrder')}
              </MetaText>
            </Pressable>
          ) : (
            <EmptyState title={t('home.resume.emptyTitle')} description={t('home.resume.emptyDescription')} />
          )}
        </Card>

        {canAccessKitchen ? (
          <Card>
            <SectionHeader title={t('home.readyToServe.title')} />
            {readyLoading ? <LoadingState title={t('home.readyToServe.loadingTitle')} /> : null}
            {!readyLoading && readyError ? (
              <EmptyState title={t('home.readyToServe.unavailableTitle')} description={readyError} />
            ) : null}
            {!readyLoading && !readyError && readyTickets.length === 0 ? (
              <EmptyState
                title={t('home.readyToServe.emptyTitle')}
                description={t('home.readyToServe.emptyDescription')}
              />
            ) : null}
            {!readyLoading && !readyError && readyTickets.length > 0 ? (
              <View style={styles.readyList}>
                {readyTickets.map((ticket) => (
                  <Pressable
                    key={ticket.id}
                    style={styles.readyRow}
                    onPress={() => {
                      if (ticket.tableId) {
                        onOpenTableContext(ticket.tableId, ticket.orderId);
                        return;
                      }
                      onGoKitchen();
                    }}
                  >
                    <View>
                      <TitleText style={styles.readyProduct}>{ticket.productName}</TitleText>
                      <MetaText>{t('home.readyToServe.tableAndOrder', { table: ticket.tableNumber, orderId: ticket.orderId })}</MetaText>
                    </View>
                    <StatusPill label={ticket.elapsedLabel} tone="warning" />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <SectionHeader title={t('home.search.title')} />
          <TextInput
            style={styles.searchInput}
            value={tableSearch}
            onChangeText={(value) => {
              setTableSearch(value);
              void searchTables(value);
            }}
            placeholder={t('home.search.placeholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          {searchLoading ? <MetaText>{t('common.loading')}</MetaText> : null}
          {searchResults.length > 0 ? (
            <View style={styles.searchResults}>
              {searchResults.map((table) => (
                <Pressable
                  key={table.id}
                  style={styles.searchRow}
                  onPress={() => onOpenTableContext(table.id, table.currentOrderId ?? undefined)}
                >
                  <TitleText style={styles.searchTitle}>{t('home.search.tableLabel', { table: table.number })}</TitleText>
                  <MetaText>
                    {table.currentOrderId
                      ? t('home.search.openOrder')
                      : t('home.search.noOpenOrder')}
                  </MetaText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>

        <Card>
          <SectionHeader title={t('home.shortcuts.title')} />
          <View style={styles.shortcutWrap}>
            {quickShortcuts.map((action) => (
              <Pressable key={action.key} style={[styles.shortcutChip, isPhone ? styles.shortcutChipPhone : styles.shortcutChipTablet]} onPress={action.onPress}>
                <MetaText>{action.label}</MetaText>
              </Pressable>
            ))}
          </View>
        </Card>
      </ScrollView>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.s4,
    gap: theme.spacing.s3,
  },
  readinessHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.s2,
  },
  readinessIdentity: {
    marginBottom: theme.spacing.s1,
  },
  statusTitle: {
    marginBottom: 0,
  },
  offlineText: {
    color: theme.colors.warning,
    marginBottom: theme.spacing.s3,
    marginTop: theme.spacing.s1,
  },
  primaryTitle: {
    marginBottom: theme.spacing.s1,
  },
  primaryDescription: {
    marginBottom: theme.spacing.s3,
  },
  resumeCard: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.s3,
  },
  resumeTitle: {
    marginBottom: theme.spacing.s1,
  },
  readyList: {
    gap: theme.spacing.s2,
  },
  readyRow: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.s3,
  },
  readyProduct: {
    marginBottom: theme.spacing.s1,
  },
  searchInput: {
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
  },
  searchResults: {
    gap: theme.spacing.s2,
  },
  searchRow: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.s2,
  },
  searchTitle: {
    marginBottom: theme.spacing.s1,
  },
  shortcutWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
  },
  shortcutChip: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
  },
  shortcutChipPhone: {
    flexBasis: '48%',
  },
  shortcutChipTablet: {
    flexBasis: '31%',
  },
});