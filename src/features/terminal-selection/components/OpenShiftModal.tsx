/**
 * OpenShiftModal
 *
 * Shown when a terminal is selected but has no active cash shift.
 * Prompts the user to enter an opening balance and open a shift before
 * proceeding to the POS.
 *
 * Required because POST /sales requires a valid cashShiftId.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, theme } from '@/platform/theme';
import { openCashShift } from '@/api/cashShifts.api';

interface OpenShiftModalProps {
  visible: boolean;
  terminalId: string;
  terminalName: string;
  onShiftOpened: (cashShiftId: string) => void;
  onCancel: () => void;
}

export function OpenShiftModal({
  visible,
  terminalId,
  terminalName,
  onShiftOpened,
  onCancel,
}: OpenShiftModalProps): React.ReactElement {
  const { t } = useTranslation();
  const [openingBalance, setOpeningBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    const balance = parseFloat(openingBalance.replace(',', '.'));
    if (isNaN(balance) || balance < 0) {
      setError(t('shift.open.invalidBalance'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shift = await openCashShift(terminalId, balance);
      onShiftOpened(shift.id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg.join(' '));
      } else {
        setError(
          typeof msg === 'string'
            ? msg
            : t('shift.open.error'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    setOpeningBalance('0');
    setError(null);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel}>
          <Pressable style={styles.card} onPress={() => undefined}>
            {/* Header */}
            <Text style={styles.title}>
              {t('shift.open.title')}
            </Text>
            <Text style={styles.subtitle}>
              {t('shift.open.terminal', { name: terminalName })}
            </Text>
            <Text style={styles.description}>
              {t('shift.open.description')}
            </Text>

            {/* Opening balance input */}
            <Text style={styles.label}>
              {t('shift.open.openingBalance')}
            </Text>
            <TextInput
              style={styles.input}
              value={openingBalance}
              onChangeText={(v) => {
                setOpeningBalance(v);
                setError(null);
              }}
              keyboardType="decimal-pad"
              selectTextOnFocus
              editable={!loading}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Inline error */}
            {error !== null && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
                onPress={() => { void handleOpen(); }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {t('shift.open.confirm')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 440,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.accentAction,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.disabled,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.lg,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.error,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.disabled,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.accentAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
