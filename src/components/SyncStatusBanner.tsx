import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '@/components/theme/theme';
import { MetaText } from '@/components/Typography';
import { useSyncStore } from '@/store/sync.store';

/**
 * Thin banner shown at the top of authenticated screens when the device is
 * offline, has writes queued for sync, or has failed sync operations.
 * Renders nothing when the device is online with an empty queue.
 */
export function SyncStatusBanner() {
  const { t } = useTranslation();
  const isOnline = useSyncStore((s) => s.isOnline);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const queueLength = useSyncStore((s) => s.queue.length);
  const failedCount = useSyncStore((s) => s.failedCount);

  if (isOnline && queueLength === 0 && !isSyncing) return null;

  let label = '';
  let variant: 'info' | 'warning' | 'error' = 'info';

  if (!isOnline) {
    label = t('sync.offline');
    variant = 'warning';
  } else if (failedCount > 0) {
    label = t('sync.failedCount', { count: failedCount });
    variant = 'error';
  } else if (isSyncing) {
    label = t('sync.syncing');
    variant = 'info';
  } else if (queueLength > 0) {
    label = t('sync.queuedCount', { count: queueLength });
    variant = 'warning';
  }

  if (!label) return null;

  return (
    <View style={[styles.banner, variantStyles[variant]]} testID="sync-status-banner">
      <MetaText style={styles.text}>{label}</MetaText>
    </View>
  );
}

const variantStyles: Record<'info' | 'warning' | 'error', { backgroundColor: string }> = {
  info: { backgroundColor: theme.colors.info },
  warning: { backgroundColor: theme.colors.warning },
  error: { backgroundColor: theme.colors.error },
};

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: theme.spacing.s3,
  },
  text: {
    color: theme.colors.textInverse,
    fontSize: 12,
  },
});
