import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  onScanned: (token: string) => void;
  onBack: () => void;
};

function extractToken(data: string): string {
  const trimmed = data.trim();
  if (trimmed.startsWith('tpvpair:')) {
    return trimmed.slice('tpvpair:'.length);
  }
  return trimmed;
}

export function QRScanScreen({ onScanned, onBack }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  const { isPhone } = useDeviceProfile();

  const cameraHeight = isPhone ? 320 : 500;

  if (!permission?.granted) {
    return (
      <ScreenPage>
        <Topbar title={t('pairing.qrTitle')} onBack={onBack} />
        <ScreenContent>
          <Card>
            <BodyText>{t('pairing.cameraPermissionRequired')}</BodyText>
            <Button title={t('pairing.grantCameraPermission')} onPress={() => void requestPermission()} />
          </Card>
        </ScreenContent>
      </ScreenPage>
    );
  }

  return (
    <ScreenPage>
      <Topbar title={t('pairing.qrTitle')} onBack={onBack} />
      <ScreenContent>
        <BodyText>{t('pairing.qrDescription')}</BodyText>
        <View style={styles.cameraWrap}>
          <CameraView
            facing="back"
            style={[styles.camera, { height: cameraHeight }]}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={
              locked
                ? undefined
                : (event) => {
                    setLocked(true);
                    onScanned(extractToken(event.data));
                  }
            }
          />
        </View>
        <View style={styles.row}>
          <Button
            title={t('pairing.scanAgain')}
            onPress={() => {
              setLocked(false);
            }}
          />
        </View>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { borderRadius: theme.spacing.s3, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  camera: { width: '100%', height: 320 },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  backRow: { marginTop: theme.spacing.s3 },
});
