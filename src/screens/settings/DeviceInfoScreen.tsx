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

type Props = {
  onBack?: () => void;
  embedded?: boolean;
};

export function DeviceInfoScreen({ onBack, embedded = false }: Props) {
  const { t } = useTranslation();
  const {
    appVersion,
    canManageDeviceContext,
    deviceInfo,
    refreshDeviceContext,
    updateDeviceContext,
    clearRemoteDeviceContext,
  } = useSettings();
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
    } catch (requestError) {
      const nextError = requestError as { message?: string } | undefined;
      setError(nextError?.message || t('settings.deviceContextRefreshError'));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateDeviceContext({
        installationId: installationId.trim() || undefined,
        deviceName: deviceName.trim() || undefined,
        deviceType: deviceType.trim() || undefined,
      });
      setMessage(t('settings.deviceContextSaved'));
    } catch (requestError) {
      const nextError = requestError as { message?: string } | undefined;
      setError(nextError?.message || t('settings.deviceContextSaveError'));
    } finally {
      setBusy(false);
    }
  }

  async function onClearRemote() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await clearRemoteDeviceContext();
      setMessage(t('settings.deviceContextCleared'));
    } catch (requestError) {
      const nextError = requestError as { message?: string } | undefined;
      setError(nextError?.message || t('settings.deviceContextClearError'));
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
          editable={canManageDeviceContext && !busy}
        />
        <View style={styles.spacer} />
        <Input
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder={t('settings.deviceContextNamePlaceholder')}
          editable={canManageDeviceContext && !busy}
        />
        <View style={styles.spacer} />
        <Input
          value={deviceType}
          onChangeText={setDeviceType}
          placeholder={t('settings.deviceContextTypePlaceholder')}
          editable={canManageDeviceContext && !busy}
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
          {canManageDeviceContext ? (
            <Button
              title={busy ? t('common.loading') : t('settings.deviceContextSaveAction')}
              onPress={() => void onSave()}
              disabled={busy}
              fullWidth
            />
          ) : null}
          {canManageDeviceContext ? (
            <Button
              title={busy ? t('common.loading') : t('settings.deviceContextClearAction')}
              onPress={() => void onClearRemote()}
              disabled={busy}
              variant="danger"
              fullWidth
            />
          ) : null}
          {!canManageDeviceContext ? <BodyText>{t('settings.deviceContextRoleHint')}</BodyText> : null}
          {!embedded && onBack ? <Button title={t('common.back')} onPress={onBack} variant="secondary" fullWidth /> : null}
        </View>
      </Card>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScreenPage>
      <Topbar title={t('settings.deviceInfoTitle')} />
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
