import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, TitleText, WarningText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useAuth } from '@/hooks/useAuth';
import type { QuickAccessProfileDto } from '@/types/api';

type Props = {
  onBack: () => void;
  onLoggedIn: () => void;
};

export function PINLoginScreen({ onBack, onLoggedIn }: Props) {
  const { t } = useTranslation();
  const { loadQuickAccessProfiles, loginUsingQuickAccess } = useAuth();

  const [profiles, setProfiles] = useState<QuickAccessProfileDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [quickAccessModalOpen, setQuickAccessModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const hasLoadedProfilesRef = useRef(false);

  useEffect(() => {
    if (hasLoadedProfilesRef.current) return;
    hasLoadedProfilesRef.current = true;

    async function loadProfiles() {
      setLoadingProfiles(true);
      setError(null);
      try {
        const result = await loadQuickAccessProfiles();
        setProfiles(result.users);
        setSetupRequired(result.setupRequired);
        if (result.users.length > 0 && !result.setupRequired) {
          setSelectedUserId(result.users[0].id);
          setQuickAccessModalOpen(true);
        }
      } catch {
        setError(t('auth.quickAccessUnavailable'));
      } finally {
        setLoadingProfiles(false);
      }
    }

    void loadProfiles();
  }, [loadQuickAccessProfiles, t]);

  const selectedProfile = profiles.find((profile) => profile.id === selectedUserId) ?? null;

  function selectQuickAccessUser(profileId: string) {
    setSelectedUserId(profileId);
    setPin('');
    setError(null);
    setQuickAccessModalOpen(false);
    setPinModalOpen(true);
  }

  async function onSubmitQuickAccess() {
    if (submitting) return;
    if (!selectedUserId) return;
    if (pin.length !== 4) {
      setError(t('auth.pinLengthError'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await loginUsingQuickAccess(selectedUserId, pin);
      onLoggedIn();
    } catch {
      setError(t('auth.invalidPin'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenPage>
      <Topbar title={t('auth.quickAccessTitle')} />
      <ScreenContent>
        <Card>
          <TitleText>{t('auth.quickAccessTitle')}</TitleText>
          <BodyText style={styles.description}>{t('auth.quickAccessDescription')}</BodyText>

          {setupRequired ? <WarningText>{t('auth.setupRequiredForQuickAccess')}</WarningText> : null}
          {loadingProfiles ? <BodyText>{t('common.loading')}</BodyText> : null}
          {selectedProfile ? (
            <View style={styles.selectedUserCard}>
              <BodyText style={styles.selectedUserName}>{selectedProfile.displayName}</BodyText>
              {selectedProfile.role ? <BodyText>{selectedProfile.role}</BodyText> : null}
            </View>
          ) : null}

          <View style={styles.rowSecondary}>
            {!setupRequired && profiles.length > 0 ? (
              <Button
                title={t('auth.quickAccessTitle')}
                onPress={() => setQuickAccessModalOpen(true)}
                variant="secondary"
                fullWidth
              />
            ) : null}
          </View>

          <View style={styles.rowSecondary}>
            <Button title={t('common.back')} onPress={onBack} variant="secondary" fullWidth />
          </View>
        </Card>
      </ScreenContent>

      <Modal
        visible={quickAccessModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickAccessModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setQuickAccessModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <TitleText>{t('auth.quickAccessTitle')}</TitleText>
            <BodyText>{t('auth.quickAccessDescription')}</BodyText>

            {loadingProfiles ? <BodyText>{t('common.loading')}</BodyText> : null}

            {!loadingProfiles ? (
              <ScrollView contentContainerStyle={styles.quickProfilesGrid}>
                {profiles.map((profile) => (
                  <Card key={profile.id} style={styles.quickProfileCard}>
                    <View style={styles.quickProfileHeader}>
                      <View style={styles.quickProfileAvatar}>
                        <TitleText style={styles.quickProfileInitials}>{profile.initials || 'U'}</TitleText>
                      </View>
                      <View style={styles.quickProfileMeta}>
                        <BodyText style={styles.selectedUserName}>{profile.displayName}</BodyText>
                        {profile.role ? <BodyText>{profile.role}</BodyText> : null}
                      </View>
                    </View>
                    <Button
                      title={t('auth.quickAccessTitle')}
                      onPress={() => selectQuickAccessUser(profile.id)}
                      variant={selectedUserId === profile.id ? 'primary' : 'secondary'}
                    />
                  </Card>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.rowSecondary}>
              <Button
                title={t('common.back')}
                onPress={() => setQuickAccessModalOpen(false)}
                variant="secondary"
                fullWidth
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={pinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPinModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <TitleText>{t('auth.pinPlaceholder')}</TitleText>
            {selectedProfile ? <BodyText style={styles.selectedUserName}>{selectedProfile.displayName}</BodyText> : null}

            <Input
              value={pin}
              onChangeText={(next) => setPin(next.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder={t('auth.pinPlaceholder')}
              secureTextEntry
            />

            {error ? <ErrorText>{error}</ErrorText> : null}

            <View style={styles.row}>
              <Button
                title={t('common.back')}
                variant="secondary"
                onPress={() => {
                  setPinModalOpen(false);
                  setQuickAccessModalOpen(true);
                }}
              />
              <Button
                title={t('auth.loginWithQuickAccess')}
                onPress={() => void onSubmitQuickAccess()}
                disabled={submitting || loadingProfiles || !selectedUserId}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s3 },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  rowSecondary: { marginTop: theme.spacing.s2 },
  selectedUserCard: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginTop: theme.spacing.s2,
    padding: theme.spacing.s2,
  },
  selectedUserName: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weightMedium,
    marginBottom: 0,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.s4,
  },
  modalCard: {
    backgroundColor: theme.colors.bgPage,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    maxHeight: '85%',
    maxWidth: 680,
    padding: theme.spacing.s4,
    width: '100%',
  },
  quickProfilesGrid: {
    gap: theme.spacing.s2,
    paddingBottom: theme.spacing.s2,
  },
  quickProfileCard: {
    marginTop: 0,
  },
  quickProfileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.s2,
    marginBottom: theme.spacing.s2,
  },
  quickProfileAvatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  quickProfileInitials: {
    marginBottom: 0,
  },
  quickProfileMeta: {
    flex: 1,
  },
});
