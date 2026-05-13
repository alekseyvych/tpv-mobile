import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { QuickActionCard } from '@/components/QuickActionCard';
import { ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  onGoQuickAccess: () => void;
  onGoDining: () => void;
  onGoKitchen: () => void;
  onGoPos: () => void;
  onGoAppointments: () => void;
  onGoSettings: () => void;
  queuedSyncCount: number;
  syncFailedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  onSyncNow: () => void;
};

export function HomeScreen({
  onGoQuickAccess,
  onGoDining,
  onGoKitchen,
  onGoPos,
  onGoAppointments,
  onGoSettings,
  queuedSyncCount,
  syncFailedCount,
  isOnline,
  isSyncing,
  onSyncNow,
}: Props) {
  const { t } = useTranslation();
  const { isPhone } = useDeviceProfile();
  const insets = useSafeAreaInsets();

  const quickActions = [
    { key: 'pos', title: t('pos.navTitle'), subtitle: t('home.actions.newSale'), onPress: onGoPos },
    { key: 'dining', title: t('dining.floorNav'), subtitle: t('dining.floorTitle'), onPress: onGoDining },
    { key: 'kitchen', title: t('kitchen.navTitle'), subtitle: t('kitchen.title'), onPress: onGoKitchen },
    { key: 'appointments', title: t('appointments.navTitle'), subtitle: t('appointments.bookAction'), onPress: onGoAppointments },
    { key: 'quick', title: t('auth.quickAccessLogin'), subtitle: t('auth.quickAccessDescription'), onPress: onGoQuickAccess },
    { key: 'settings', title: t('common.settings'), subtitle: t('settings.languageTitle'), onPress: onGoSettings },
  ];

  return (
    <ScreenPage>
      <Topbar title={t('common.home')} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.s4 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.statusHeader}>
            <TitleText style={styles.statusTitle}>{t('common.appName')}</TitleText>
            <StatusPill label={isOnline ? t('sync.online') : t('sync.offline')} tone={isOnline ? 'success' : 'warning'} />
          </View>
          <BodyText style={styles.description}>
            {isOnline ? t('sync.online') : t('sync.offline')} | {t('sync.queuedCount', { count: queuedSyncCount })}
            {syncFailedCount > 0 ? ` | ${t('sync.failedCount', { count: syncFailedCount })}` : ''}
          </BodyText>
          <Button title={isSyncing ? t('sync.syncing') : t('sync.syncNow')} onPress={onSyncNow} />
        </Card>

        <Card>
          <SectionHeader title={t('home.quickActions.title')} />
          <View style={styles.quickActionGrid}>
            {quickActions.map((action) => (
              <View key={action.key} style={isPhone ? styles.quickActionItemPhone : styles.quickActionItemTablet}>
                <QuickActionCard
                  title={action.title}
                  subtitle={action.subtitle}
                  onPress={action.onPress}
                  disabled={isSyncing}
                />
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <SectionHeader title={t('home.metrics.title')} />
          <View style={styles.metricGrid}>
            <View style={styles.metricItem}><MetricCard label={t('sync.online')} value={isOnline ? t('sync.online') : t('sync.offline')} /></View>
            <View style={styles.metricItem}><MetricCard label={t('sync.queuedCount', { count: queuedSyncCount })} value={String(queuedSyncCount)} /></View>
            <View style={styles.metricItem}><MetricCard label={t('sync.failedCount', { count: syncFailedCount })} value={String(syncFailedCount)} /></View>
          </View>
        </Card>

        <Card>
          <SectionHeader title={t('home.activity.title')} />
          <EmptyState title={t('home.activity.recentSales')} description={t('home.activity.empty')} />
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
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.s2,
  },
  statusTitle: {
    marginBottom: 0,
  },
  description: { marginBottom: theme.spacing.s3 },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
  },
  quickActionItemPhone: {
    flexBasis: '48%',
  },
  quickActionItemTablet: {
    flexBasis: '31%',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
  },
  metricItem: {
    flexGrow: 1,
    flexBasis: 180,
  },
});
