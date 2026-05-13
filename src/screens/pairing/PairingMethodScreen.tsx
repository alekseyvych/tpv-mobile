import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  onChooseQr: () => void;
  onChooseManual: () => void;
  onBack: () => void;
};

export function PairingMethodScreen({ onChooseQr, onChooseManual, onBack }: Props) {
  const { t } = useTranslation();
  const { isPhone } = useDeviceProfile();

  return (
    <ScreenPage>
      <Topbar title={t('pairing.methodTitle')} />
      <ScreenContent>
        <View style={isPhone ? undefined : styles.tabletFormContainer}>
          <Card>
            <TitleText>{t('pairing.methodTitle')}</TitleText>
            <BodyText style={styles.description}>{t('pairing.methodDescription')}</BodyText>
            <View style={styles.row}>
              <Button title={t('pairing.useQr')} onPress={onChooseQr} />
              <Button title={t('pairing.useManual')} onPress={onChooseManual} variant="secondary" />
            </View>
            <View style={styles.backRow}>
              <Button title={t('common.back')} onPress={onBack} variant="secondary" fullWidth />
            </View>
          </Card>
        </View>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s4 },
  row: { flexDirection: 'row', gap: theme.spacing.s2 },
  backRow: { marginTop: theme.spacing.s3 },
  tabletFormContainer: {
    alignItems: 'center',
    width: '100%',
  },
});
