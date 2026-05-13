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
import { useAuth } from '@/hooks/useAuth';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import { isValidEmail } from '@/utils/validation';

type Props = {
  onGoHome: () => void;
  onGoPinLogin: () => void;
};

export function LoginScreen({ onGoHome, onGoPinLogin }: Props) {
  const { t } = useTranslation();
  const { loginWithEmailPassword } = useAuth();
  const { isPhone } = useDeviceProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (password.length === 0) {
      setError(t('auth.passwordRequired'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await loginWithEmailPassword(normalizedEmail, password);
      onGoHome();
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenPage>
      <Topbar title={t('common.login')} />
      <ScreenContent>
        <View style={isPhone ? undefined : styles.tabletFormContainer}>
          <Card>
            <TitleText>{t('auth.title')}</TitleText>
            <BodyText style={styles.description}>{t('auth.description')}</BodyText>
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.emailPlaceholder')}
            />
            <View style={styles.inputSpacer} />
            <Input value={password} onChangeText={setPassword} secureTextEntry placeholder={t('auth.passwordPlaceholder')} />
            {error ? <ErrorText>{error}</ErrorText> : null}
            <View style={styles.row}>
              <Button title={submitting ? t('auth.signingIn') : t('auth.signIn')} onPress={() => void onSubmit()} disabled={submitting} />
            </View>
            <View style={styles.rowSecondary}>
              <Button title={t('auth.quickAccessLogin')} onPress={onGoPinLogin} variant="secondary" fullWidth />
            </View>
          </Card>
        </View>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s4 },
  inputSpacer: { height: theme.spacing.s2 },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  rowSecondary: { marginTop: theme.spacing.s2 },
  tabletFormContainer: {
    alignItems: 'center',
    width: '100%',
  },
});
