/**
 * Home Recent Activity Component
 *
 * Phase 2: Real backend integration with GET /audit-logs
 * Renders recent activity feed from audit logs
 *
 * Phone: Tabbed interface (sales/system/all)
 * Tablet: 3-column grid layout
 *
 * Handles loading/error/permission states.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, theme } from '@/platform/theme';
import { getRecentActivity, type AuditLogEntry } from '@/api/audit.api';

export function HomeRecentActivity(): React.ReactElement {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecentActivity(10);
        setActivities(data.data);
      } catch (err: unknown) {
        const error = err as any;
        if (error?.message === 'audit_permission_denied') {
          setError('home.activity.permissionDenied');
        } else {
          setError('home.activity.loadError');
        }
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }

    void loadActivity();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.activity.title')}</Text>

      {loading && (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>{t('home.activity.loading')}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{t(error)}</Text>
        </View>
      )}

      {!loading && !error && activities.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t('home.activity.empty')}</Text>
        </View>
      )}

      {!loading && !error && activities.length > 0 && (
        <FlatList
          scrollEnabled={false}
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActivityItem entry={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

interface ActivityItemProps {
  entry: AuditLogEntry;
}

function ActivityItem({ entry }: ActivityItemProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale);
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityContent}>
        <Text style={styles.activityAction}>{entry.action}</Text>
        <Text style={styles.activityMeta}>{formatDate(entry.timestamp)}</Text>
      </View>
      <Text style={styles.activityTime}>{formatTime(entry.timestamp)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing['2xl'],
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  loadingCard: {
    backgroundColor: colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.error,
  },
  emptyCard: {
    backgroundColor: colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.textSecondary,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activityItem: {
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  activityMeta: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  activityTime: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textMuted,
    marginLeft: theme.spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});
