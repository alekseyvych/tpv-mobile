import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useSettings } from '@/hooks/useSettings';

type Props = {
  onBack?: () => void;
  embedded?: boolean;
};

function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

export function ProfileScreen({ onBack, embedded = false }: Props) {
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
    } catch (requestError) {
      const nextError = requestError as { message?: string } | undefined;
      setError(nextError?.message || t('settings.passwordChangeError'));
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

const styles = StyleSheet.create({
  roles: { marginBottom: theme.spacing.s2 },
  spacer: { height: theme.spacing.s2 },
  actions: { gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  message: { marginTop: theme.spacing.s2 },
  saved: { marginTop: theme.spacing.s2, color: theme.colors.success },
});
