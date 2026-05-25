import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useSettings } from '@/hooks/useSettings';
import { hasRoleAtLeast } from '@/auth/access';

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

function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

function ProfileScreenContent({ onBack, embedded = false }: Props) {
  const { t } = useTranslation();
  const { user, changeOwnPassword } = useSettings();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit() {
    if (!currentPassword.trim()) {
      setError(t('settings.passwordCurrentRequired'));
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError(t('settings.passwordInvalid'));
      return;
    }

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setSaved(true);
    } catch (error) {
      if (extractPermissionError(error)) {
        setError(t('settings.passwordChangePermissionError'));
      } else {
        setError(t('settings.passwordChangeError'));
      }
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <>
      <Card>
        <SectionHeader title={t('settings.profileTitle')} subtitle={t('settings.profileDescription')} />
        <BodyText>{`${t('settings.profileNameLabel')}: ${`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '-'}`}</BodyText>
        <BodyText>{`${t('settings.profileEmailLabel')}: ${user?.email ?? '-'}`}</BodyText>
        <BodyText>{`${t('settings.profileUserIdLabel')}: ${user?.id ?? '-'}`}</BodyText>
        <BodyText>{`${t('settings.profileTenantIdLabel')}: ${user?.tenantId ?? '-'}`}</BodyText>
        <BodyText style={styles.roles}>{`${t('settings.profileRolesLabel')}: ${(user?.roles ?? []).join(', ') || '-'}`}</BodyText>
      </Card>
      <Card>
        <SectionHeader title={t('settings.passwordTitle')} subtitle={t('settings.passwordDescription')} />
        <Input
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={t('settings.passwordCurrentPlaceholder')}
          secureTextEntry
          editable={!busy}
        />
        <View style={styles.spacer} />
        <Input
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('settings.passwordNewPlaceholder')}
          secureTextEntry
          editable={!busy}
        />
        {error ? <ErrorText style={styles.message}>{error}</ErrorText> : null}
        {saved ? <BodyText style={styles.saved}>{t('settings.passwordChanged')}</BodyText> : null}
        {embedded ? (
          <View style={styles.actions}>
            <Button
              title={busy ? t('common.loading') : t('settings.passwordChangeAction')}
              onPress={() => void onSubmit()}
              disabled={busy}
              fullWidth
            />
          </View>
        ) : null}
      </Card>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScreenPage>
      <Topbar
        title={t('settings.profileTitle')}
        onBack={onBack}
        rightActionLabel={busy ? t('common.loading') : t('settings.passwordChangeAction')}
        onRightAction={() => {
          void onSubmit();
        }}
        rightActionDisabled={busy}
      />
      <ScreenContent>{content}</ScreenContent>
    </ScreenPage>
  );
}

export function ProfileScreen({ onBack, embedded = false }: Props) {
  const roles = useAuthStore((s) => s.roles);
  const { t } = useTranslation();

  // When embedded in Settings, ProfileScreen is only accessible by MANAGER+ role
  // Re-check permission here to prevent UI from showing password change after admin→waiter swap
  if (embedded && !hasRoleAtLeast(roles, 'MANAGER')) {
    return (
      <Card>
        <SectionHeader title={t('settings.profileTitle')} />
        <ErrorText>{t('settings.passwordChangePermissionError')}</ErrorText>
      </Card>
    );
  }

  return <ProfileScreenContent onBack={onBack} embedded={embedded} />;
}

const styles = StyleSheet.create({
  roles: { marginBottom: theme.spacing.s2 },
  spacer: { height: theme.spacing.s2 },
  actions: { gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  message: { marginTop: theme.spacing.s2 },
  saved: { marginTop: theme.spacing.s2, color: theme.colors.success },
});
