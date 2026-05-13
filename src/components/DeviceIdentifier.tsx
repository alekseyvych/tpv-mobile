import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/components/theme/theme';

type Props = {
  installationId: string;
  tenantId: string;
  deviceName: string;
  deviceType: string;
  configuredAt: string;
  appVersion: string;
};

export function DeviceIdentifier({ installationId, tenantId, deviceName, deviceType, configuredAt, appVersion }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.deviceInfoTitle')}</Text>
      <Text style={styles.row}>{`${t('settings.deviceInfoInstallationLabel')}: ${installationId}`}</Text>
      <Text style={styles.row}>{`${t('settings.deviceInfoTenantLabel')}: ${tenantId}`}</Text>
      <Text style={styles.row}>{`${t('settings.deviceInfoNameLabel')}: ${deviceName}`}</Text>
      <Text style={styles.row}>{`${t('settings.deviceInfoTypeLabel')}: ${deviceType}`}</Text>
      <Text style={styles.row}>{`${t('settings.deviceInfoConfiguredLabel')}: ${configuredAt}`}</Text>
      <Text style={styles.row}>{`${t('settings.deviceInfoPlatformLabel')}: ${Platform.OS}`}</Text>
      <Text style={styles.row}>{`${t('settings.appVersionLabel')}: ${appVersion}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.s1,
  },
  title: {
    fontSize: theme.typography.sizeMd,
    fontWeight: theme.typography.weightBold,
    marginBottom: theme.spacing.s1,
  },
  row: {
    color: theme.colors.textSecondary,
  },
});
