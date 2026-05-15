import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { QuickAccessAuthModal } from '@/components/auth/QuickAccessAuthModal';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  onBack: () => void;
  onLoggedIn: () => void;
};

export function PINLoginScreen({ onBack, onLoggedIn }: Props) {
  const { t } = useTranslation();
  const { loginUsingQuickAccess } = useAuth();
  const [quickAccessModalOpen, setQuickAccessModalOpen] = useState(true);

  return (
    <ScreenPage>
      <Topbar title={t('auth.quickAccessTitle')} onBack={onBack} />
      <ScreenContent>
        <Card>
          <TitleText>{t('auth.quickAccessTitle')}</TitleText>
          <BodyText style={{ marginBottom: theme.spacing.s3 }}>{t('auth.quickAccessDescription')}</BodyText>
          <Button
            title={t('auth.quickAccessTitle')}
            onPress={() => setQuickAccessModalOpen(true)}
            variant="secondary"
            fullWidth
          />
        </Card>
      </ScreenContent>

      <QuickAccessAuthModal
        visible={quickAccessModalOpen}
        onClose={() => setQuickAccessModalOpen(false)}
        title={t('auth.quickAccessTitle')}
        description={t('auth.quickAccessDescription')}
        submitLabel={t('auth.loginWithQuickAccess')}
        onAuthenticated={async (userId, pin) => {
          await loginUsingQuickAccess(userId, pin);
          onLoggedIn();
        }}
      />
    </ScreenPage>
  );
}
