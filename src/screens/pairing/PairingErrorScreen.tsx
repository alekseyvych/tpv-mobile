import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { theme } from '@/components/theme/theme';

type Props = {
  onRetry: () => void;
  onBack: () => void;
};

export function PairingErrorScreen({ onRetry, onBack }: Props) {
  const { t } = useTranslation();

  return (
    <ScreenPage>
      <Topbar title={t('pairing.errorTitle')} />
      <ScreenContent>
        <Card>
          <ErrorState
            title={t('pairing.errorTitle')}
            description={t('pairing.errorDescription')}
          />
          <View style={styles.row}>
            <Button title={t('common.retry')} onPress={onRetry} />
            <Button title={t('common.back')} onPress={onBack} variant="secondary" />
          </View>
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
    marginTop: theme.spacing.s2,
  },
});
