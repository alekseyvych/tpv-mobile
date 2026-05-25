/**
 * Terminal Selection Screen
 *
 * Phase 3: Real terminal selection for mobile/tablet
 *
 * Displays list of active POS terminals and allows user to select one.
 * Selected terminal determines:
 * - Which mode-specific modules are visible in navigation (RETAIL vs RESTAURANT)
 * - What workflows are available (zone/table picking for RESTAURANT, direct to POS for RETAIL)
 *
 * Flow:
 * 1. Load list of active terminals
 * 2. Display as grid (tablet) or list (phone)
 * 3. User selects terminal
 * 4. Store terminal selection + operating mode in store
 * 5. Navigate to next screen (TBD: shift open, shift resume, or POS)
 *
 * Handles:
 * - Loading state (skeleton cards)
 * - Error state (permission denied 403, network errors, empty list)
 * - Empty state (no terminals available)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors, theme } from '@/platform/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenPage, ScreenContent } from '@/components/ScreenLayout';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { getTerminals, type Terminal, type OperatingMode } from '@/api/terminals.api';
import { getActiveCashShift } from '@/api/cashShifts.api';
import { useTerminalStore } from '@/store/terminal.store';
import { useOfflineDetection } from '@/utils/offline';
import { OpenShiftModal } from '../components/OpenShiftModal';


interface TerminalItemProps {
  terminal: Terminal;
  isSelected: boolean;
  onSelect: (terminal: Terminal) => void;
  isLoading?: boolean;
}

function TerminalItem({ terminal, isSelected, onSelect, isLoading }: TerminalItemProps) {
  const { t, i18n } = useTranslation();
  const statusColor = terminal.active ? colors.success : colors.error;
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';

  const modeIconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] =
    terminal.operatingMode === 'RESTAURANT'
      ? 'silverware-fork-knife'
      : terminal.operatingMode === 'PERSONALIZED'
        ? 'cog-outline'
        : 'shopping-outline';

  return (
    <TouchableOpacity
      style={[
        styles.terminalCard,
        isSelected && styles.terminalCardSelected,
        !terminal.active && styles.terminalCardDisabled,
      ]}
      onPress={() => onSelect(terminal)}
      disabled={!terminal.active || isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.terminalHeader}>
        {terminal.image ? (
          <Text style={styles.terminalImageText}>{terminal.image}</Text>
        ) : (
          <MaterialCommunityIcons
            name={modeIconName}
            size={32}
            color={colors.accentAction}
            style={styles.terminalImageIcon}
          />
        )}
        <View style={styles.terminalName}>
          <Text style={styles.terminalNameText}>{terminal.name}</Text>
          <Text style={styles.terminalId}>{terminal.terminalId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <MaterialCommunityIcons
            name={terminal.active ? 'check' : 'close'}
            size={16}
            color={colors.textInverse}
          />
        </View>
      </View>

      {terminal.location && (
        <Text style={styles.terminalLocation}>{terminal.location}</Text>
      )}

      <View style={styles.terminalMeta}>
        <Text style={styles.terminalMode}>
          {terminal.operatingMode === 'RESTAURANT'
            ? t('terminal.selection.modeRestaurant')
            : terminal.operatingMode === 'PERSONALIZED'
              ? t('terminal.selection.modePersonalized')
              : t('terminal.selection.modeRetail')}
        </Text>
        {terminal.lastUsedAt && (
          <Text style={styles.terminalLastUsed}>
            {`${t('terminal.selection.lastUsed')}: ${new Date(terminal.lastUsedAt).toLocaleString(locale)}`}
          </Text>
        )}
      </View>

      {isSelected && (
        <View style={styles.selectedOverlay}>
          <Text style={styles.selectedText}>{t('terminal.selection.selected')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function TerminalSelectionScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { isOnline } = useOfflineDetection();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [pendingTerminal, setPendingTerminal] = useState<Terminal | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const { setSelectedTerminal: storeTerminal, setActiveCashShiftId } = useTerminalStore();

  function mapTerminalListError(err: unknown): 'permission' | 'load' {
    const message = (err as { message?: string } | undefined)?.message ?? '';
    const status =
      (err as { status?: number } | undefined)?.status ??
      (err as { response?: { status?: number } } | undefined)?.response?.status;

    if (
      status === 401 ||
      status === 403 ||
      message === 'terminals_permission_denied' ||
      /permission|forbidden|unauthorized/i.test(message)
    ) {
      return 'permission';
    }

    return 'load';
  }

  const resolveModeRoute = (terminal: Terminal): 'Checkout' | 'DiningFloor' => {
    if (terminal.operatingMode === 'RESTAURANT') {
      return 'DiningFloor';
    }

    if (terminal.operatingMode === 'PERSONALIZED') {
      const usesDining =
        (terminal.capabilities as { enableDiningFloorAndTables?: boolean } | null)
          ?.enableDiningFloorAndTables === true;
      return usesDining ? 'DiningFloor' : 'Checkout';
    }

    return 'Checkout';
  };

  useEffect(() => {
    async function loadTerminals() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTerminals(true); // Only active terminals
        setTerminals(data);
        if (data.length === 0) {
          setError('empty');
        }
      } catch (err) {
        setError(mapTerminalListError(err));
        setTerminals([]);
      } finally {
        setLoading(false);
      }
    }

    void loadTerminals();
  }, []);

  const proceedWithTerminal = (terminal: Terminal, cashShiftId: string) => {
    storeTerminal(
      terminal.id,
      terminal.operatingMode as OperatingMode,
      terminal.capabilities ?? null,
      terminal.name || terminal.terminalId || terminal.id,
    );
    setActiveCashShiftId(cashShiftId);
    navigation.replace(resolveModeRoute(terminal));
  };

  const handleSelectTerminal = async (terminal: Terminal) => {
    setIsSelecting(true);
    setSelectedTerminal(terminal);

    try {
      const activeShift = await getActiveCashShift(terminal.terminalId);
      if (activeShift) {
        proceedWithTerminal(terminal, activeShift.id);
      } else {
        // No open shift — ask user to open one
        setPendingTerminal(terminal);
        setShowShiftModal(true);
      }
    } catch (err) {
      console.error('Error selecting terminal:', err);
      setError('load');
      setSelectedTerminal(null);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleShiftOpened = (cashShiftId: string) => {
    setShowShiftModal(false);
    if (pendingTerminal) {
      proceedWithTerminal(pendingTerminal, cashShiftId);
      setPendingTerminal(null);
    }
  };

  const handleShiftModalCancel = () => {
    setShowShiftModal(false);
    setPendingTerminal(null);
    setSelectedTerminal(null);
  };

  const retryLoad = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTerminals(true);
      setTerminals(data);
      if (data.length === 0) {
        setError('empty');
      }
    } catch (err) {
      setError(mapTerminalListError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenPage>
      <Topbar title={t('terminal.selection.title')} />
      {pendingTerminal && (
        <OpenShiftModal
          visible={showShiftModal}
          terminalId={pendingTerminal.terminalId}
          terminalName={pendingTerminal.name}
          onShiftOpened={handleShiftOpened}
          onCancel={handleShiftModalCancel}
        />
      )}
      <ScreenContent>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              {t('terminal.selection.subtitle')}
            </Text>
            {!isOnline ? <StatusPill label={t('sync.offline')} tone="warning" /> : null}
          </View>

          {loading && (
            <View style={styles.centerContainer}>
              <LoadingState
                title={t('terminal.selection.loading')}
                description={!isOnline ? t('home.sync.offlineDescription') : undefined}
              />
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              {error === 'empty' ? (
                <EmptyState
                  title={t('terminal.selection.empty')}
                  description={t('terminal.selection.emptyMsg')}
                  actionLabel={t('common.retry')}
                  onAction={() => {
                    void retryLoad();
                  }}
                />
              ) : (
                <ErrorState
                  title={
                    error === 'permission'
                      ? t('terminal.selection.permissionDenied')
                      : t('terminal.selection.error')
                  }
                  description={
                    error === 'permission'
                      ? t('terminal.selection.permissionDeniedMsg')
                      : t('terminal.selection.errorMsg')
                  }
                  actionLabel={error === 'permission' ? undefined : t('common.retry')}
                  onAction={
                    error === 'permission'
                      ? undefined
                      : () => {
                          void retryLoad();
                        }
                  }
                />
              )}
            </View>
          )}

          {!loading && !error && terminals.length > 0 && (
            <FlatList
              data={terminals}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: theme.spacing.xl + insets.bottom },
              ]}
              renderItem={({ item }) => (
                <TerminalItem
                  terminal={item}
                  isSelected={selectedTerminal?.id === item.id}
                  onSelect={handleSelectTerminal}
                  isLoading={isSelecting}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  errorContainer: {
    backgroundColor: colors.bgPage,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
  },
  terminalCard: {
    backgroundColor: colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  terminalCardSelected: {
    borderColor: colors.accentAction,
    backgroundColor: colors.bgPanel,
  },
  terminalCardDisabled: {
    opacity: 0.5,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  terminalImageText: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  terminalImageIcon: {
    marginRight: theme.spacing.md,
  },
  terminalName: {
    flex: 1,
  },
  terminalNameText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  terminalId: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  terminalLocation: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  terminalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  terminalMode: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textMuted,
  },
  terminalLastUsed: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textMuted,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.accentAction,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopRightRadius: theme.radius.lg,
  },
  selectedText: {
    color: colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.xs,
  },
  separator: {
    height: 0,
    marginVertical: theme.spacing.xs,
  },
});
