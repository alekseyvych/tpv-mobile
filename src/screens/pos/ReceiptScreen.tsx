import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, MetaText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { getSaleReceipt } from '@/api/sales.api';
import { useSaleFlow } from '@/hooks/useSaleFlow';
import type { ReceiptDto } from '@/types/api';

type Props = {
  onDone: () => void;
};

export function ReceiptScreen({ onDone }: Props) {
  const { t } = useTranslation();
  const { lastSaleId } = useSaleFlow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const currentReceipt = receipt && receipt.saleId === lastSaleId ? receipt : null;

  useEffect(() => {
    if (!lastSaleId) {
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void getSaleReceipt(lastSaleId)
        .then((data) => setReceipt(data))
        .catch(() => {
          setError(t('pos.receiptLoadError', 'Receipt details could not be loaded.'));
        })
        .finally(() => {
          setLoading(false);
        });
    }, 0);

    return () => clearTimeout(timer);
  }, [lastSaleId, t]);

  return (
    <ScreenPage>
      <Topbar title={t('pos.receiptTitle')} />
      <ScreenContent>
        <Card>
          <StatusPill label={t('pos.receiptStatusReady')} tone="success" />
          <SectionHeader title={t('pos.receiptTitle')} />
          <BodyText>{`${t('pos.saleIdLabel')}: ${lastSaleId ?? '-'}`}</BodyText>
          {loading ? <BodyText>{t('common.loading')}</BodyText> : null}
          {error ? <ErrorText>{error}</ErrorText> : null}

          {currentReceipt ? (
            <View style={styles.block}>
              <MetaText>{`${t('pos.receiptNumberLabel', 'Receipt number')}: ${currentReceipt.receiptNumber ?? currentReceipt.saleNumber}`}</MetaText>
              {currentReceipt.lines.map((line) => (
                <View key={`${line.productName}-${line.quantity}`} style={styles.lineRow}>
                  <BodyText>{`${line.quantity} x ${line.productName}`}</BodyText>
                  <MetaText>{`${line.lineTotal.toFixed(2)} EUR`}</MetaText>
                </View>
              ))}
              <MetaText>{`${t('pos.subtotalLabel', 'Subtotal')}: ${currentReceipt.subtotal.toFixed(2)} EUR`}</MetaText>
              <MetaText>{`${t('pos.taxLabel', 'Tax')}: ${currentReceipt.tax.toFixed(2)} EUR`}</MetaText>
              <BodyText>{`${t('pos.totalLabel')}: ${currentReceipt.total.toFixed(2)} EUR`}</BodyText>
              {currentReceipt.payments.map((payment, index) => (
                <MetaText key={`${payment.method}-${index}`}>{`${t('pos.paymentLabel', 'Payment')} ${payment.method}: ${payment.amount.toFixed(2)} EUR`}</MetaText>
              ))}
            </View>
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
