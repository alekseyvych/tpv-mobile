/**
 * Adaptive Home Screen
 *
 * Main dashboard for both phone and tablet, with layout adapting based on device.
 *
 * Phone Layout (vertical scroll):
 * - User greeting header
 * - Quick action cards (1 per row, tall buttons)
 * - Summary metrics (2x2 grid)
 * - Alerts (vertical list)
 * - Recent activity (vertical list)
 *
 * Tablet Layout (optimized for width):
 * - User greeting header
 * - Quick action cards (3 per row)
 * - Summary metrics (4 per row)
 * - Alerts (horizontal list or sidebar)
 * - Recent activity (tabbed sections)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import { colors, theme } from '@/platform/theme';
import { LAYOUT } from '@/platform/breakpoints';
import { HomeStatusHeader } from '@/features/home/components/HomeStatusHeader';
import { HomeQuickActions } from '@/features/home/components/HomeQuickActions';
import { HomeSummaryCards } from '@/features/home/components/HomeSummaryCards';
import { HomeRecentActivity } from '@/features/home/components/HomeRecentActivity';

export function HomeScreen() {
  const { t } = useTranslation();
  const { isPhone } = useDeviceProfile();
  const user = useAuthStore((s) => s.user);
  const [loading] = useState(false);

  useEffect(() => {
    // TODO: Load dashboard data (metrics, alerts, recent activity)
    // Data loading will be implemented when dashboard API is available
  }, []);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.accentAction} />
        <Text style={styles.loadingText}>{t('dashboard.messages.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        isPhone && styles.phoneContent,
        !isPhone && styles.tabletContent,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* User greeting and status header */}
      <HomeStatusHeader userName={user?.email || 'User'} />

      {/* Quick action buttons */}
      <HomeQuickActions isPhone={isPhone} />

      {/* Summary KPI cards */}
      <HomeSummaryCards isPhone={isPhone} />

      {/* Recent activity sections */}
      <HomeRecentActivity />

      {/* Spacer for phone to account for bottom nav */}
      {isPhone && <View style={{ height: LAYOUT.spacing.xl }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.contentPaddingHorizontal,
    paddingVertical: LAYOUT.contentPaddingVertical,
  },
  phoneContent: {
    // Phone-specific optimizations
    maxWidth: '100%',
  },
  tabletContent: {
    // Tablet optimizations
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPage,
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
});
