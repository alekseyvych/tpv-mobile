import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { getSaleReceipt } from '@/api/sales.api';
import { useSaleFlow } from '@/hooks/useSaleFlow';
import type { ReceiptDto } from '@/types/api';
import { useOfflineDetection } from '@/utils/offline';

type Props = {
  onDone: () => void;
};

export function ReceiptScreen({ onDone }: Props) {
  const { t, i18n } = useTranslation();
  const { lastSaleId } = useSaleFlow();
  const { isOnline } = useOfflineDetection();
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const currentReceipt = receipt && receipt.saleId === lastSaleId ? receipt : null;
  const formatAmount = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);

  const loadReceipt = useCallback(() => {
    if (!lastSaleId) {
      return;
    }
    setLoading(true);
    setError(null);
    void getSaleReceipt(lastSaleId)
      .then((data) => setReceipt(data))
      .catch(() => {
        setError(t('pos.receiptLoadError'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [lastSaleId, t]);

  useEffect(() => {
    if (!lastSaleId) {
      return;
    }

    const timer = setTimeout(() => {
      loadReceipt();
    }, 0);

    return () => clearTimeout(timer);
  }, [lastSaleId, loadReceipt]);

  return (
    <ScreenPage>
      <Topbar title={t('pos.receiptTitle')} />
      <ScreenContent>
        <Card>
          <StatusPill label={t('pos.receiptStatusReady')} tone="success" />
          {!isOnline ? <StatusPill label={t('sync.offline')} tone="warning" /> : null}
          <SectionHeader title={t('pos.receiptTitle')} />
          <BodyText>{`${t('pos.saleIdLabel')}: ${lastSaleId ?? '-'}`}</BodyText>
          {loading ? (
            <LoadingState
              title={t('common.loading')}
              description={!isOnline ? t('home.sync.offlineDescription') : undefined}
            />
          ) : null}
          {error ? (
            <ErrorState
              title={t('pos.errorTitle')}
              description={error}
              actionLabel={t('common.retry')}
              onAction={loadReceipt}
            />
          ) : null}

          {currentReceipt ? (
            <View style={styles.block}>
              <MetaText>{`${t('pos.receiptNumberLabel')}: ${currentReceipt.receiptNumber ?? currentReceipt.saleNumber}`}</MetaText>
              {currentReceipt.lines.map((line) => (
                <View key={`${line.productName}-${line.quantity}`} style={styles.lineRow}>
                  <BodyText>{`${line.quantity} x ${line.productName}`}</BodyText>
                  <MetaText>{formatAmount(line.lineTotal)}</MetaText>
                </View>
              ))}
              <MetaText>{`${t('pos.subtotalLabel')}: ${formatAmount(currentReceipt.subtotal)}`}</MetaText>
              <MetaText>{`${t('pos.taxLabel')}: ${formatAmount(currentReceipt.tax)}`}</MetaText>
              <BodyText>{`${t('pos.totalLabel')}: ${formatAmount(currentReceipt.total)}`}</BodyText>
              {currentReceipt.payments.map((payment, index) => (
                <MetaText key={`${payment.method}-${index}`}>{`${t('pos.paymentLabel')} ${payment.method}: ${formatAmount(payment.amount)}`}</MetaText>
              ))}
            </View>
          ) : !loading && !error ? (
            <EmptyState
              title={t('pos.receiptTitle')}
              description={t('pos.cloudReceiptHint')}
              actionLabel={t('common.retry')}
              onAction={loadReceipt}
            />
          ) : null}
          <BodyText style={styles.hint}>{t('pos.cloudReceiptHint')}</BodyText>
          <Button title={t('pos.newSale')} onPress={onDone} fullWidth />
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: theme.spacing.s2 },
  block: { marginTop: theme.spacing.s2, marginBottom: theme.spacing.s2, gap: theme.spacing.s1 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
