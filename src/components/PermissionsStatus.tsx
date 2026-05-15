import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, type PermissionStatus } from 'expo-camera';

import { theme } from '@/components/theme/theme';

export function PermissionsStatus() {
  const { t } = useTranslation();
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus | 'unknown'>('unknown');

  useEffect(() => {
    async function loadPermissions() {
      try {
        const result = await Camera.getCameraPermissionsAsync();
        setCameraStatus(result.status);
      } catch {
        setCameraStatus('unknown');
      }
    }

    void loadPermissions();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.permissionsTitle')}</Text>
      <Text style={styles.row}>{`${t('settings.permissionsCameraLabel')}: ${cameraStatus}`}</Text>
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
  },
  row: {
    color: theme.colors.textSecondary,
  },
});
