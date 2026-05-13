import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  onGoHome: () => void;
  onGoProfile: () => void;
  onGoDeviceInfo: () => void;
  onGoLanguage: () => void;
  onGoLogoutConfirm: () => void;
  onGoInactivity: () => void;
};

export function SettingsScreen({ onGoHome, onGoProfile, onGoDeviceInfo, onGoLanguage, onGoLogoutConfirm, onGoInactivity }: Props) {
  const { t } = useTranslation();

  return (
    <ScreenPage>
      <Topbar title={t('common.settings')} />
      <ScreenContent>
        <Card>
          <TitleText>{t('common.settings')}</TitleText>
          <Button style={styles.menuBtn} title={t('common.home')} onPress={onGoHome} variant="secondary" fullWidth />
          <Button style={styles.menuBtn} title={t('settings.profileTitle')} onPress={onGoProfile} variant="secondary" fullWidth />
          <Button style={styles.menuBtn} title={t('settings.deviceInfoTitle')} onPress={onGoDeviceInfo} variant="secondary" fullWidth />
          <Button style={styles.menuBtn} title={t('settings.languageTitle')} onPress={onGoLanguage} variant="secondary" fullWidth />
          <Button style={styles.menuBtn} title={t('inactivity.title')} onPress={onGoInactivity} variant="secondary" fullWidth />
          <Button style={styles.menuBtn} title={t('settings.logoutTitle')} onPress={onGoLogoutConfirm} variant="danger" fullWidth />
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  menuBtn: { marginTop: theme.spacing.s2 },
});
