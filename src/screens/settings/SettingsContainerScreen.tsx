import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import { DeviceInfoScreen } from '@/screens/settings/DeviceInfoScreen';
import { InactivitySettingsScreen } from '@/screens/settings/InactivitySettingsScreen';
import { LanguageScreen } from '@/screens/settings/LanguageScreen';
import { LogoutConfirmationScreen } from '@/screens/settings/LogoutConfirmationScreen';
import { ProfileScreen } from '@/screens/settings/ProfileScreen';

type SettingsSection = 'profile' | 'language' | 'device' | 'inactivity' | 'logout';

type Props = {
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenLanguage: () => void;
  onOpenDevice: () => void;
  onOpenInactivity: () => void;
  onOpenLogout: () => void;
};

export function SettingsContainerScreen({
  onBack,
  onOpenProfile,
  onOpenLanguage,
  onOpenDevice,
  onOpenInactivity,
  onOpenLogout,
}: Props) {
  const { t } = useTranslation();
  const { isPhone } = useDeviceProfile();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const sections: { id: SettingsSection; label: string; onPress: () => void }[] = [
    { id: 'profile', label: t('settings.profileTitle'), onPress: onOpenProfile },
    { id: 'language', label: t('settings.languageTitle'), onPress: onOpenLanguage },
    { id: 'device', label: t('settings.deviceInfoTitle'), onPress: onOpenDevice },
    { id: 'inactivity', label: t('inactivity.title'), onPress: onOpenInactivity },
    { id: 'logout', label: t('settings.logoutTitle'), onPress: onOpenLogout },
  ];

  if (isPhone) {
    return (
      <ScreenPage>
        <Topbar title={t('common.settings')} />
        <ScreenContent>
          <Card>
            <TitleText>{t('common.settings')}</TitleText>
            <FlatList
              data={sections}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Button
                  title={item.label}
                  onPress={item.onPress}
                  variant="secondary"
                  fullWidth
                  style={styles.phoneAction}
                />
              )}
            />
            <Button title={t('common.back')} onPress={onBack} variant="secondary" fullWidth style={styles.phoneAction} />
          </Card>
        </ScreenContent>
      </ScreenPage>
    );
  }

  function renderActiveSection() {
    if (activeSection === 'profile') {
      return <ProfileScreen embedded />;
    }
    if (activeSection === 'language') {
      return <LanguageScreen embedded />;
    }
    if (activeSection === 'device') {
      return <DeviceInfoScreen embedded />;
    }
    if (activeSection === 'inactivity') {
      return <InactivitySettingsScreen embedded />;
    }
    return <LogoutConfirmationScreen embedded onDone={onBack} />;
  }

  return (
    <ScreenPage>
      <Topbar title={t('common.settings')} />
      <ScreenContent>
        <View style={styles.tabletSplitPane}>
          {/* Sidebar */}
          <View style={styles.tabletSidebar}>
            <Card>
              <TitleText>{t('settings.profileTitle')}</TitleText>
              <FlatList
                data={sections}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Button
                    title={item.label}
                    onPress={() => setActiveSection(item.id)}
                    variant={activeSection === item.id ? 'primary' : 'secondary'}
                    fullWidth
                    style={styles.tabletNavButton}
                  />
                )}
              />
              <Button title={t('common.back')} onPress={onBack} variant="secondary" fullWidth style={styles.tabletNavButton} />
            </Card>
          </View>

          <View style={styles.tabletContentPanel}>
            {renderActiveSection()}
          </View>
        </View>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  tabletSplitPane: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
    flex: 1,
  },
  tabletSidebar: {
    flex: 0.25,
  },
  tabletContentPanel: {
    flex: 0.75,
  },
  phoneAction: { marginTop: theme.spacing.s2 },
  tabletNavButton: { marginTop: theme.spacing.s2 },
});
