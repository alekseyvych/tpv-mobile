/**
 * Home Summary Cards Component
 *
 * Phase 2: Real backend integration with GET /analytics/dashboard
 * Renders KPI cards from live analytics endpoint
 *
 * Phone: 2x2 grid
 * Tablet: 4x1 row
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, theme } from '@/platform/theme';
import { getDashboard } from '@/api/analytics.api';

interface KPIMetric {
  id: string;
  label: string;
  value: string;
  change?: string;
}

interface HomeSummaryCardsProps {
  isPhone: boolean;
}

export function HomeSummaryCards({ isPhone }: HomeSummaryCardsProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboard('day');
        
        // Map dashboard KPIs to metric cards
        const kpis = data.kpis;
        const mappedMetrics: KPIMetric[] = [
          {
            id: 'totalRevenue',
            label: 'home.metrics.dailySales',
            value: formatCurrency(kpis.totalRevenue, locale),
            change: kpis.comparison ? formatChange(kpis.totalRevenue, kpis.comparison.totalRevenue) : undefined,
          },
          {
            id: 'transactionCount',
            label: 'home.metrics.ticketCount',
            value: formatNumber(kpis.transactionCount, locale),
            change: kpis.comparison ? formatChange(kpis.transactionCount, kpis.comparison.transactionCount) : undefined,
          },
          {
            id: 'avgTransactionValue',
            label: 'home.metrics.averageTicket',
            value: formatCurrency(kpis.avgTransactionValue, locale),
            change: kpis.comparison ? formatChange(kpis.avgTransactionValue, kpis.comparison.avgTransactionValue) : undefined,
          },
          {
            id: 'totalItemsSold',
            label: 'home.metrics.productsSold',
            value: formatNumber(kpis.totalItemsSold, locale),
            change: kpis.comparison ? formatChange(kpis.totalItemsSold, kpis.comparison.totalItemsSold) : undefined,
          },
        ];
        setMetrics(mappedMetrics);
      } catch (err: unknown) {
        const error = err as any;
        if (error?.message === 'dashboard_permission_denied') {
          setError('home.metrics.permissionDenied');
        } else {
          setError('home.metrics.loadError');
        }
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    }

    void loadMetrics();
  }, [locale]);

  const numColumns = isPhone ? 2 : 4;
  const containerStyle = isPhone ? styles.gridPhone : styles.gridTablet;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.metrics.title')}</Text>

      {loading && (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>{t('home.metrics.loading')}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{t(error)}</Text>
        </View>
      )}

      {!loading && !error && (
        <View style={containerStyle}>
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              columnCount={numColumns}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface MetricCardProps {
  metric: KPIMetric;
  columnCount: number;
}

function MetricCard({ metric, columnCount }: MetricCardProps) {
  const { t } = useTranslation();
  const itemWidth = columnCount === 2 ? '48%' : '24%';

  return (
    <View
      style={[
        styles.card,
        { width: itemWidth },
      ]}
    >
      <Text style={styles.cardLabel}>{t(metric.label)}</Text>
      <Text style={styles.cardValue}>{metric.value}</Text>

      {metric.change && (
        <Text style={[
          styles.cardChange,
          metric.change.startsWith('+') ? styles.cardChangePositive : styles.cardChangeNegative
        ]}>
          {metric.change}
        </Text>
      )}
    </View>
  );
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(Math.round(value));
}

function formatChange(current: number, previous: number): string {
  if (previous === 0) return '+0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
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
  gridPhone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  gridTablet: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentAction,
  },
  cardLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  cardValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  cardChange: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  cardChangePositive: {
    color: colors.success,
  },
  cardChangeNegative: {
    color: colors.error,
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
});
