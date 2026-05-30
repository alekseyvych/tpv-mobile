import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DeviceIdentifier } from '@/components/DeviceIdentifier';
import { Input } from '@/components/Input';
import { PermissionsStatus } from '@/components/PermissionsStatus';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText } from '@/components/Typography';
import { useSettings } from '@/hooks/useSettings';
import { theme } from '@/components/theme/theme';

function extractPermissionError(error: unknown): boolean {
  const apiError = error as Record<string, unknown> | null;
  if (!apiError) return false;
  const status = apiError.status as number | undefined;
  if (status === 403) return true;
  const response = apiError.response as Record<string, unknown> | null;
  if (response && response.status === 403) return true;
  return false;
}

type Props = {
  onBack?: () => void;
  embedded?: boolean;
};

export function DeviceInfoScreen({ onBack, embedded = false }: Props) {
  const { t } = useTranslation();
  const { appVersion, deviceInfo, refreshDeviceContext } = useSettings();
  const [installationId, setInstallationId] = useState(
    deviceInfo.installationId === 'unknown' ? '' : deviceInfo.installationId,
  );
  const [deviceName, setDeviceName] = useState(
    deviceInfo.deviceName === 'mobile-device' ? '' : deviceInfo.deviceName,
  );
  const [deviceType, setDeviceType] = useState(deviceInfo.deviceType);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRefresh() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await refreshDeviceContext();
      setMessage(t('settings.deviceContextRefreshed'));
    } catch (error) {
      if (extractPermissionError(error)) {
        setError(t('settings.deviceContextPermissionError'));
      } else {
        setError(t('settings.deviceContextRefreshError'));
      }
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <>
      <Card>
        <SectionHeader title={t('settings.deviceInfoTitle')} subtitle={t('settings.deviceInfoDescription')} />
        <DeviceIdentifier {...deviceInfo} appVersion={appVersion} />
      </Card>
      <Card>
        <PermissionsStatus />
      </Card>
      <Card>
        <SectionHeader title={t('settings.deviceContextTitle')} subtitle={t('settings.deviceContextDescription')} />
        <Input
          value={installationId}
          onChangeText={setInstallationId}
          placeholder={t('settings.deviceContextInstallationPlaceholder')}
          editable={false}
        />
        <View style={styles.spacer} />
        <Input
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder={t('settings.deviceContextNamePlaceholder')}
          editable={false}
        />
        <View style={styles.spacer} />
        <Input
          value={deviceType}
          onChangeText={setDeviceType}
          placeholder={t('settings.deviceContextTypePlaceholder')}
          editable={false}
        />
        {message ? <BodyText style={styles.saved}>{message}</BodyText> : null}
        {error ? <ErrorText style={styles.message}>{error}</ErrorText> : null}
        <View style={styles.actions}>
          <Button
            title={busy ? t('common.loading') : t('settings.deviceContextRefreshAction')}
            onPress={() => void onRefresh()}
            variant="secondary"
            fullWidth
          />
          <BodyText>{t('settings.deviceContextRoleHint')}</BodyText>
        </View>
      </Card>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScreenPage>
      <Topbar title={t('settings.deviceInfoTitle')} onBack={onBack} />
      <ScreenContent>{content}</ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  spacer: { height: theme.spacing.s2 },
  actions: { gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  message: { marginTop: theme.spacing.s2 },
  saved: { marginTop: theme.spacing.s2, color: theme.colors.success },
});
