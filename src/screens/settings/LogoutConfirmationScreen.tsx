import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useSettings } from '@/hooks/useSettings';

type Props = {
  onBack?: () => void;
  onDone: () => void;
  embedded?: boolean;
};

export function LogoutConfirmationScreen({ onBack, onDone, embedded = false }: Props) {
  const { t } = useTranslation();
  const { logoutThisDevice, logoutEveryDevice, factoryReset } = useSettings();
  const [busy, setBusy] = useState(false);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <Card>
          <TitleText>{t('settings.logoutTitle')}</TitleText>
          <BodyText style={styles.description}>{t('settings.logoutDescription')}</BodyText>
          <View style={styles.row}>
            <Button
              title={busy ? t('common.loading') : t('settings.logoutThisDevice')}
              onPress={() => void runAction(logoutThisDevice)}
              disabled={busy}
              fullWidth
            />
            <Button
              title={busy ? t('common.loading') : t('settings.logoutAllDevices')}
              onPress={() => void runAction(logoutEveryDevice)}
              disabled={busy}
              variant="secondary"
              fullWidth
            />
            <Button
              title={busy ? t('common.loading') : t('settings.factoryReset')}
              onPress={() => void runAction(factoryReset)}
              disabled={busy}
              variant="danger"
              fullWidth
            />
          </View>
        </Card>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScreenPage>
      <Topbar title={t('settings.logoutTitle')} onBack={onBack} />
      <ScreenContent>{content}</ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s4 },
  row: { gap: theme.spacing.s2 },
});
