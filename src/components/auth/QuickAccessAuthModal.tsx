import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import { clearLockout, getLockoutState, recordFailedAttempt } from '@/utils/pin-lockout';
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
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Decrement lockout countdown every second.
  const lockoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (lockoutIntervalRef.current) {
        clearInterval(lockoutIntervalRef.current);
        lockoutIntervalRef.current = null;
      }
      return;
    }
    lockoutIntervalRef.current = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
    };
  }, [lockoutSeconds]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedUserId) ?? null,
    [profiles, selectedUserId],
  );

  function handleClose() {
    setPinModalOpen(false);
    setPin('');
    setSelectedUserId(null);
    setError(null);
    setLockoutSeconds(0);
    onClose();
  }

  function handleClosePinModal() {
    setPinModalOpen(false);
    setPin('');
    setError(null);
    setLockoutSeconds(0);
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
        setSelectedUserId(null);
        setPinModalOpen(false);
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

    // Check lockout before attempting auth.
    const lockout = await getLockoutState(selectedUserId);
    if (lockout.isLocked) {
      setLockoutSeconds(lockout.remainingSeconds);
      setError(t('auth.pinLocked', { seconds: lockout.remainingSeconds }));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onAuthenticated(selectedUserId, pin);
      await clearLockout(selectedUserId);
      // Don't call handleClose here - let parent component handle navigation
      // and modal will close via the visible prop
    } catch {
      const state = await recordFailedAttempt(selectedUserId);
      if (state.isLocked) {
        setLockoutSeconds(state.remainingSeconds);
        setError(t('auth.pinLocked', { seconds: state.remainingSeconds }));
      } else {
        setError(
          state.attemptsLeft > 0
            ? t('auth.invalidPinAttemptsLeft', { count: state.attemptsLeft })
            : t('auth.invalidPin'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropCloseLayer} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            isPhone ? styles.phoneSheet : styles.tabletSheet,
            isPhone ? { paddingBottom: Math.max(theme.spacing.s4, insets.bottom), paddingTop: Math.max(theme.spacing.s4, insets.top) } : null,
          ]}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.headerSection}>
              <TitleText>{title}</TitleText>
              <BodyText style={styles.description}>{description}</BodyText>

              {setupRequired ? <ErrorText>{t('auth.setupRequiredForQuickAccess')}</ErrorText> : null}
              {loadingProfiles ? <BodyText>{t('common.loading')}</BodyText> : null}
            </View>

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
                    title={t('auth.selectProfile')}
                    onPress={() => {
                      setSelectedUserId(profile.id);
                      setPin('');
                      setError(null);
                      setPinModalOpen(true);
                    }}
                    variant={selectedUserId === profile.id ? 'primary' : 'secondary'}
                    fullWidth
                  />
                </Card>
              ))}
            </ScrollView>

            {!pinModalOpen && error ? <ErrorText style={styles.errorText}>{error}</ErrorText> : null}

            <View style={styles.actionsRow}>
              <Button title={t('common.cancel')} onPress={handleClose} variant="secondary" />
            </View>
          </View>
        </View>
      </View>
      </Modal>

      <Modal
        visible={visible && pinModalOpen && !!selectedProfile}
        transparent
        animationType="fade"
        onRequestClose={handleClosePinModal}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropCloseLayer} onPress={handleClosePinModal} />
          <View
            style={[
              styles.sheet,
              styles.pinSheet,
              isPhone ? { paddingBottom: Math.max(theme.spacing.s4, insets.bottom) } : null,
            ]}
          >
            <View style={styles.pinContentWrapper}>
              <TitleText>{title}</TitleText>
              {selectedProfile ? <BodyText style={styles.pinLabel}>{selectedProfile.displayName}</BodyText> : null}
              <Input
                value={pin}
                onChangeText={(next) => setPin(next.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder={t('auth.pinPlaceholder')}
                secureTextEntry
              />

              {error ? <ErrorText style={styles.errorText}>{error}</ErrorText> : null}

              <View style={styles.actionsRow}>
                <Button title={t('common.cancel')} onPress={handleClosePinModal} variant="secondary" />
                <Button
                  title={submitLabel}
                  onPress={() => void handleSubmit()}
                  disabled={submitting || loadingProfiles || setupRequired || !selectedUserId || lockoutSeconds > 0}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  backdropCloseLayer: {
    ...StyleSheet.absoluteFill,
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
    flex: 1,
    maxHeight: undefined,
    marginVertical: 0,
  },
  tabletSheet: {
    maxHeight: '88%',
  },
  pinSheet: {
    maxWidth: 340,
    flex: undefined,
    maxHeight: 380,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
  },
  pinContentWrapper: {
    flexDirection: 'column',
  },
  headerSection: {
    marginBottom: theme.spacing.s3,
  },
  description: {
    marginBottom: theme.spacing.s2,
  },
  profileScroll: {
    flex: 1,
    minHeight: 0,
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
    marginBottom: theme.spacing.s2,
  },
  errorText: {
    marginBottom: theme.spacing.s2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
    marginTop: theme.spacing.s3,
  },
});
