import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  installationId?: string;
  onContinue: () => void;
};

export function PairingSuccessScreen({ installationId, onContinue }: Props) {
  const { t } = useTranslation();

  return (
    <ScreenPage>
      <Topbar title={t('pairing.successTitle')} />
      <ScreenContent>
        <Card>
          <StatusPill label={t('pairing.statusReady')} tone="success" />
          <TitleText>{t('pairing.successTitle')}</TitleText>
          <BodyText>{t('pairing.successDescription')}</BodyText>
          {installationId ? <MetaText style={styles.meta}>{`${t('pairing.installationIdLabel')}: ${installationId}`}</MetaText> : null}
          <Button title={t('pairing.continueToApp')} onPress={onContinue} fullWidth />
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  meta: {
    marginBottom: theme.spacing.s3,
  },
});
