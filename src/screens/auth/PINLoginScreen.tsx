import { useTranslation } from 'react-i18next';
import { useState } from 'react';

import { QuickAccessAuthModal } from '@/components/auth/QuickAccessAuthModal';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  onBack: () => void;
  onLoggedIn: () => void;
};

export function PINLoginScreen({ onBack, onLoggedIn }: Props) {
  const { t } = useTranslation();
  const { loginUsingQuickAccess } = useAuth();
  const [modalVisible, setModalVisible] = useState(true);

  return (
    <QuickAccessAuthModal
      visible={modalVisible}
      onClose={() => {
        setModalVisible(false);
        onBack();
      }}
      title={t('auth.quickAccessTitle')}
      description={t('auth.quickAccessDescription')}
      submitLabel={t('auth.loginWithQuickAccess')}
      onAuthenticated={async (userId, pin) => {
        await loginUsingQuickAccess(userId, pin);
        // Close modal then navigate
        setModalVisible(false);
        onLoggedIn();
      }}
    />
  );
}
