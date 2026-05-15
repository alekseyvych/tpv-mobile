import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import type { QuickAccessProfileDto } from '@/types/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { BodyText, ErrorText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: (userId: string, pin: string) => Promise<void>;
  title: string;
  description: string;
  submitLabel: string;
};

export function QuickAccessAuthModal({
  visible,
  onClose,
  onAuthenticated,
  title,
  description,
  submitLabel,
}: Props) {
  const { t } = useTranslation();
  const { loadQuickAccessProfiles } = useAuth();
  const { isPhone } = useDeviceProfile();
  const insets = useSafeAreaInsets();

  const [profiles, setProfiles] = useState<QuickAccessProfileDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedUserId) ?? null,
    [profiles, selectedUserId],
  );

  function handleClose() {
    setPin('');
    setSelectedUserId(null);
    setError(null);
    onClose();
  }

  useEffect(() => {
    if (!visible) return;

    async function loadProfiles() {
      setLoadingProfiles(true);
      setError(null);
      try {
        const result = await loadQuickAccessProfiles();
        setProfiles(result.users);
        setSetupRequired(result.setupRequired);
        if (result.users.length > 0 && !result.setupRequired) {
          setSelectedUserId(result.users[0].id);
        }
      } catch {
        setProfiles([]);
        setError(t('auth.quickAccessUnavailable'));
      } finally {
        setLoadingProfiles(false);
      }
    }

    void loadProfiles();
  }, [loadQuickAccessProfiles, t, visible]);

  async function handleSubmit() {
    if (!selectedUserId) return;
    if (pin.length !== 4) {
      setError(t('auth.pinLengthError'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onAuthenticated(selectedUserId, pin);
      handleClose();
    } catch {
      setError(t('auth.invalidPin'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          onPress={() => undefined}
          style={[
            styles.sheet,
            isPhone ? styles.phoneSheet : styles.tabletSheet,
            isPhone ? { paddingBottom: Math.max(theme.spacing.s4, insets.bottom) } : null,
          ]}
        >
          <TitleText>{title}</TitleText>
          <BodyText style={styles.description}>{description}</BodyText>

          {setupRequired ? <ErrorText>{t('auth.setupRequiredForQuickAccess')}</ErrorText> : null}
          {loadingProfiles ? <BodyText>{t('common.loading')}</BodyText> : null}

          <ScrollView contentContainerStyle={styles.profilesList} style={styles.profileScroll}>
            {profiles.map((profile) => (
              <Card key={profile.id} style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatar}>
                    <TitleText style={styles.profileInitials}>{profile.initials || 'U'}</TitleText>
                  </View>
                  <View style={styles.profileMeta}>
                    <BodyText style={styles.profileName}>{profile.displayName}</BodyText>
                    {profile.role ? <MetaText>{profile.role}</MetaText> : null}
                  </View>
                </View>
                <Button
                  title={selectedUserId === profile.id ? t('common.done') : t('auth.selectProfile')}
                  onPress={() => {
                    setSelectedUserId(profile.id);
                    setError(null);
                  }}
                  variant={selectedUserId === profile.id ? 'primary' : 'secondary'}
                  fullWidth
                />
              </Card>
            ))}
          </ScrollView>

          {selectedProfile ? (
            <>
              <BodyText style={styles.pinLabel}>{selectedProfile.displayName}</BodyText>
              <Input
                value={pin}
                onChangeText={(next) => setPin(next.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder={t('auth.pinPlaceholder')}
                secureTextEntry
              />
            </>
          ) : null}

          {error ? <ErrorText>{error}</ErrorText> : null}

          <View style={styles.actionsRow}>
            <Button title={t('common.cancel')} onPress={handleClose} variant="secondary" />
            <Button
              title={submitLabel}
              onPress={() => void handleSubmit()}
              disabled={submitting || loadingProfiles || setupRequired || !selectedUserId}
            />
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
    maxWidth: 680,
    padding: theme.spacing.s4,
    width: '100%',
  },
  phoneSheet: {
    marginTop: 'auto',
  },
  tabletSheet: {
    maxHeight: '88%',
  },
  description: {
    marginBottom: theme.spacing.s2,
  },
  profileScroll: {
    maxHeight: 280,
  },
  profilesList: {
    gap: theme.spacing.s2,
    paddingBottom: theme.spacing.s1,
  },
  profileCard: {
    marginTop: 0,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.s2,
    marginBottom: theme.spacing.s2,
  },
  profileAvatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  profileInitials: {
    marginBottom: 0,
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontWeight: theme.typography.weightMedium,
  },
  pinLabel: {
    marginTop: theme.spacing.s2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
    marginTop: theme.spacing.s3,
  },
});
