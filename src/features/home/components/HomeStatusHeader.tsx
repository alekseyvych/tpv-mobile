/**
 * Home Status Header Component
 *
 * Renders user greeting and device/business status information.
 * Adapts layout for phone (stacked) vs tablet (horizontal).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import { useContextStore } from '@/store/context.store';
import { colors, theme } from '@/platform/theme';

interface HomeStatusHeaderProps {
  userName?: string;
}

export function HomeStatusHeader({ userName }: HomeStatusHeaderProps) {
  const { t } = useTranslation();
  const { isPhone } = useDeviceProfile();
  const localContext = useContextStore((s) => s.localContext);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('home.greeting.morning')
      : hour < 18
        ? t('home.greeting.afternoon')
        : t('home.greeting.evening');

  return (
    <View
      style={[
        styles.container,
        isPhone ? styles.phoneLayout : styles.tabletLayout,
      ]}
    >
      {/* Greeting */}
      <View>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.userName}>{userName || 'User'}</Text>
      </View>

      {/* Status badges (if available) */}
      {localContext && (
        <View
          style={[
            styles.statusRow,
            isPhone && styles.statusRowPhone,
          ]}
        >
          <StatusBadge
            label={t('home.status.device')}
            value={localContext.deviceName || 'Device'}
          />
          <StatusBadge
            label={t('home.status.installation')}
            value={localContext.installationId?.slice(0, 8) || ''}
          />
          {localContext.deviceType && (
            <StatusBadge
              label={t('home.status.type')}
              value={localContext.deviceType}
            />
          )}
        </View>
      )}
    </View>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={styles.badgeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing['2xl'],
  },
  phoneLayout: {
    // Stack vertically on phone
  },
  tabletLayout: {
    // Can be horizontal if space allows
  },
  greeting: {
    fontSize: theme.typography.fontSize.lg,
    color: colors.textSecondary,
    fontWeight: theme.typography.fontWeight.normal,
    marginBottom: theme.spacing.sm,
  },
  userName: {
    fontSize: theme.typography.fontSize['2xl'],
    color: colors.textPrimary,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statusRowPhone: {
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: colors.bgPanel,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  badgeLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  badgeValue: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.xs,
  },
});
