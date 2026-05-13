import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useLocalContext } from '@/hooks/useLocalContext';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  onConnected: () => void;
  onCancel: () => void;
  onStartPairing: () => void;
};

export function ConnectBusinessScreen({ onConnected, onCancel, onStartPairing }: Props) {
  const { t } = useTranslation();
  const { connectContext } = useLocalContext();
  const { isPhone } = useDeviceProfile();
  const [installationId, setInstallationId] = useState('mobile-device-01');
  const [deviceName, setDeviceName] = useState('Mobile Device');
  const [deviceType, setDeviceType] = useState('TABLET');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = deviceName.trim().length > 0 && deviceType.trim().length > 0;

  async function onSubmit() {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Connect with device name and type (installationId is managed by backend)
      await connectContext({ deviceName: deviceName.trim(), deviceType: deviceType.trim() });
      onConnected();
    } catch {
      setError(t('context.connectError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenPage>
      <Topbar title={t('context.connectTitle')} />
      <ScreenContent>
        <View style={isPhone ? undefined : styles.tabletFormContainer}>
          <Card>
            <TitleText>{t('context.connectTitle')}</TitleText>
            <BodyText style={styles.description}>{t('context.connectDescription')}</BodyText>

            <Input
              value={installationId}
              onChangeText={setInstallationId}
              autoCapitalize="none"
              placeholder={t('context.installationIdPlaceholder')}
            />
            <Input value={deviceName} onChangeText={setDeviceName} placeholder={t('context.deviceNamePlaceholder')} />
            <Input value={deviceType} onChangeText={setDeviceType} placeholder={t('context.deviceTypePlaceholder')} />

            {error ? <ErrorText>{error}</ErrorText> : null}

            <View style={styles.row}>
              <Button title={t('common.login')} onPress={onCancel} disabled={submitting} variant="secondary" />
              <Button title={submitting ? t('context.connecting') : t('context.connectAction')} onPress={() => void onSubmit()} disabled={!canSubmit || submitting} />
            </View>
            <View style={styles.pairingRow}>
              <Button title={t('pairing.startPairing')} onPress={onStartPairing} variant="secondary" fullWidth />
            </View>
          </Card>
        </View>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s3 },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  pairingRow: { marginTop: theme.spacing.s2 },
  tabletFormContainer: {
    alignItems: 'center',
    width: '100%',
  },
});
