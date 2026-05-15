import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useSaleFlow } from '@/hooks/useSaleFlow';

type Props = {
  onBack: () => void;
  onCheckout: () => void;
};

export function CartScreen({ onBack, onCheckout }: Props) {
  const { t } = useTranslation();
  const { lines, removeLine, total } = useSaleFlow();
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScreenPage>
      <Topbar title={t('pos.cartTitle')} onBack={onBack} />
      <ScreenContent>
        <Card>
          <TitleText>{t('pos.cartTitle')}</TitleText>
          <BodyText style={styles.description}>{`${t('pos.totalLabel')}: ${total.toFixed(2)}`}</BodyText>
          <FlatList
            data={lines}
            keyExtractor={(item) => item.productId}
            renderItem={({ item }) => (
              <View style={styles.line}>
                <MetaText style={styles.lineText}>{`${item.name} x${item.quantity}`}</MetaText>
                <Button title={t('pos.removeLine')} onPress={() => removeLine(item.productId)} disabled={submitting} variant="secondary" />
              </View>
            )}
            ListEmptyComponent={<BodyText style={styles.empty}>{t('pos.emptyCart')}</BodyText>}
          />
          <View style={styles.row}>
            <Button title={t('pos.goPayment')} onPress={() => { setSubmitting(true); onCheckout(); }} disabled={submitting || lines.length === 0} />
          </View>
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s3 },
  line: { marginBottom: theme.spacing.s2 },
  lineText: { marginBottom: theme.spacing.s1 },
  empty: { marginVertical: theme.spacing.s2 },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s2 },
});
