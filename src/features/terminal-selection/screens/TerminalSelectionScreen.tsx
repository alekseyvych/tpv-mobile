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
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, theme } from '@/platform/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenPage, ScreenContent } from '@/components/ScreenLayout';
import { getTerminals, type Terminal, type OperatingMode } from '@/api/terminals.api';
import { getActiveCashShift } from '@/api/cashShifts.api';
import { useTerminalStore } from '@/store/terminal.store';
import { OpenShiftModal } from '../components/OpenShiftModal';


interface TerminalItemProps {
  terminal: Terminal;
  isSelected: boolean;
  onSelect: (terminal: Terminal) => void;
  isLoading?: boolean;
}

function TerminalItem({ terminal, isSelected, onSelect, isLoading }: TerminalItemProps) {
  const mode = terminal.operatingMode === 'RESTAURANT' ? '🍽️' : terminal.operatingMode === 'PERSONALIZED' ? '⚙️' : '🛍️';
  const statusIcon = terminal.active ? '✓' : '✗';
  const statusColor = terminal.active ? colors.success : colors.error;

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
        <Text style={styles.terminalImage}>
          {terminal.image || mode}
        </Text>
        <View style={styles.terminalName}>
          <Text style={styles.terminalNameText}>{terminal.name}</Text>
          <Text style={styles.terminalId}>{terminal.terminalId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusIcon}</Text>
        </View>
      </View>

      {terminal.location && (
        <Text style={styles.terminalLocation}>{terminal.location}</Text>
      )}

      <View style={styles.terminalMeta}>
        <Text style={styles.terminalMode}>
          {terminal.operatingMode === 'RESTAURANT'
            ? '🍽️ Restaurant'
            : terminal.operatingMode === 'PERSONALIZED'
              ? '⚙️ Personalized'
              : '🛍️ Retail'}
        </Text>
        {terminal.lastUsedAt && (
          <Text style={styles.terminalLastUsed}>
            Last: {new Date(terminal.lastUsedAt).toLocaleString('es-ES')}
          </Text>
        )}
      </View>

      {isSelected && (
        <View style={styles.selectedOverlay}>
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function TerminalSelectionScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [pendingTerminal, setPendingTerminal] = useState<Terminal | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const { setSelectedTerminal: storeTerminal, setActiveCashShiftId } = useTerminalStore();

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
          setError('terminals_empty');
        }
      } catch (err: unknown) {
        const error = err as any;
        if (error?.message === 'terminals_permission_denied') {
          setError('terminals_permission_denied');
        } else {
          setError('terminals_load_error');
        }
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
      setError('terminals_selection_error');
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
        setError('terminals_empty');
      }
    } catch (err: unknown) {
      const error = err as any;
      setError(error?.message === 'terminals_permission_denied' ? 'terminals_permission_denied' : 'terminals_load_error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenPage>
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
            <Text style={styles.title}>{t('terminal.selection.title', 'Select Terminal')}</Text>
            <Text style={styles.subtitle}>
              {t('terminal.selection.subtitle', 'Choose a POS terminal to begin')}
            </Text>
          </View>

          {loading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.accentAction} />
              <Text style={styles.loadingText}>
                {t('terminal.selection.loading', 'Loading terminals...')}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>
                {error === 'terminals_permission_denied'
                  ? t('terminal.selection.permissionDenied', 'Permission denied')
                  : error === 'terminals_empty'
                    ? t('terminal.selection.empty', 'No terminals available')
                    : t('terminal.selection.error', 'Failed to load terminals')}
              </Text>
              <Text style={styles.errorMessage}>
                {error === 'terminals_permission_denied'
                  ? t('terminal.selection.permissionDeniedMsg', 'You do not have permission to view terminals.')
                  : error === 'terminals_empty'
                    ? t('terminal.selection.emptyMsg', 'No active terminals have been created yet.')
                    : t('terminal.selection.errorMsg', 'Please try again later or contact support.')}
              </Text>
              {error !== 'terminals_permission_denied' && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    void retryLoad();
                  }}
                >
                  <Text style={styles.retryButtonText}>
                    {t('terminal.selection.retry', 'Retry')}
                  </Text>
                </TouchableOpacity>
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
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
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
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    marginBottom: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.error,
    marginBottom: theme.spacing.sm,
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 1.5,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
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
  terminalImage: {
    fontSize: 32,
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
  statusBadgeText: {
    color: colors.textInverse,
    fontWeight: theme.typography.fontWeight.bold,
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
