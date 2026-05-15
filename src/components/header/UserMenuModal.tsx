import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { BodyText, ErrorText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  visible: boolean;
  userName: string;
  swapBlocked: boolean;
  swapBlockedMessage: string;
  onClose: () => void;
  onOpenOptions: () => void;
  onLogout: () => void;
  onSwap: () => void;
};

export function UserMenuModal({
  visible,
  userName,
  swapBlocked,
  swapBlockedMessage,
  onClose,
  onOpenOptions,
  onLogout,
  onSwap,
}: Props) {
  const { t } = useTranslation();
  const { isPhone } = useDeviceProfile();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => undefined}
          style={[
            styles.sheet,
            isPhone ? styles.phoneSheet : styles.tabletSheet,
            isPhone ? { paddingBottom: Math.max(theme.spacing.s4, insets.bottom) } : null,
          ]}
        >
          <TitleText>{t('header.userMenu.title')}</TitleText>
          <BodyText style={styles.userName}>{userName}</BodyText>

          <View style={styles.actions}>
            <Button title={t('header.userMenu.options')} onPress={onOpenOptions} fullWidth />
            <Button title={t('header.userMenu.logout')} onPress={onLogout} variant="secondary" fullWidth />
            <Button
              title={t('header.userMenu.swapAccount')}
              onPress={onSwap}
              disabled={swapBlocked}
              variant="secondary"
              fullWidth
            />
          </View>

          {swapBlocked ? <ErrorText>{swapBlockedMessage}</ErrorText> : null}

          <View style={styles.closeRow}>
            <Button title={t('common.done')} onPress={onClose} variant="secondary" fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.s3,
  },
  sheet: {
    backgroundColor: theme.colors.bgPage,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    maxWidth: 520,
    padding: theme.spacing.s4,
    width: '100%',
  },
  phoneSheet: {
    marginTop: 'auto',
  },
  tabletSheet: {
    maxHeight: '88%',
  },
  userName: {
    marginBottom: theme.spacing.s2,
  },
  actions: {
    gap: theme.spacing.s2,
  },
  closeRow: {
    marginTop: theme.spacing.s2,
  },
});
