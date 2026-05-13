/**
 * FirstInitScreen — shown ONLY on the very first app launch on a new device.
 * After successful pairing via QR, `deviceInitialized` is set in storage
 * and this screen is never shown again.
 *
 * Flow:
 *   App cold start → FirstInitScreen (QR scan)
 *     → on QR scanned → PairingLoading → PairingSuccess → Home
 *     → on "use manual code" → PairingManual → PairingLoading → PairingSuccess → Home
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CenteredScreenContent, ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  onScanned: (token: string) => void;
  onUseManualCode: () => void;
};

function extractToken(data: string): string {
  const trimmed = data.trim();
  if (trimmed.startsWith('tpvpair:')) {
    return trimmed.slice('tpvpair:'.length);
  }
  return trimmed;
}

export function FirstInitScreen({ onScanned, onUseManualCode }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  if (!permission?.granted) {
    return (
      <ScreenPage>
        <Topbar title={t('pairing.firstInit.title')} />
        <CenteredScreenContent>
          <Card>
            <TitleText>{t('pairing.firstInit.welcomeTitle')}</TitleText>
            <BodyText>{t('pairing.firstInit.welcomeDescription')}</BodyText>
            <BodyText>{t('pairing.cameraPermissionRequired')}</BodyText>
            <View style={styles.btnRow}>
              <Button
                title={t('pairing.grantCameraPermission')}
                onPress={() => void requestPermission()}
                fullWidth
              />
            </View>
            <View style={styles.btnRow}>
              <Button
                title={t('pairing.firstInit.useManualCode')}
                onPress={onUseManualCode}
                variant="secondary"
                fullWidth
              />
            </View>
          </Card>
        </CenteredScreenContent>
      </ScreenPage>
    );
  }

  return (
    <ScreenPage>
      <Topbar title={t('pairing.firstInit.title')} />
      <ScreenContent>
        <TitleText>{t('pairing.firstInit.welcomeTitle')}</TitleText>
        <BodyText>{t('pairing.firstInit.scanInstruction')}</BodyText>
        <MetaText>{t('pairing.firstInit.scanHint')}</MetaText>
        <View style={styles.cameraWrap}>
          <CameraView
            facing="back"
            style={styles.camera}
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
        {locked ? (
          <BodyText>{t('pairing.firstInit.scanning')}</BodyText>
        ) : null}
        <View style={styles.btnRow}>
          <Button
            title={t('pairing.scanAgain')}
            onPress={() => setLocked(false)}
            variant="secondary"
            fullWidth
          />
        </View>
        <View style={styles.btnRow}>
          <Button
            title={t('pairing.firstInit.useManualCode')}
            onPress={onUseManualCode}
            variant="secondary"
            fullWidth
          />
        </View>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.s3,
  },
  camera: { width: '100%', height: 320 },
  btnRow: { marginTop: theme.spacing.s2 },
});
