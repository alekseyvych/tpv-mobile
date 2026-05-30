import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';

import { CenteredScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { LoadingState } from '@/components/LoadingState';
import { Topbar } from '@/components/Topbar';
import { useLocalContext } from '@/hooks/useLocalContext';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';

type Props = {
  onContextReady: () => void;
  onSetupRequired: () => void;
  onLoginRequired?: () => void;
};

export function LocalContextCheckScreen({ onContextReady, onSetupRequired, onLoginRequired }: Props) {
  const { t } = useTranslation();
  const { loadContext } = useLocalContext();
  const setCheckingContext = useContextStore((s) => s.setCheckingContext);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    async function check() {
      // Pairing establishes device context, but auth is still required afterward.
      if (!user) {
        if (onLoginRequired) {
          onLoginRequired();
        } else {
          onSetupRequired();
        }
        return;
      }

      setCheckingContext(true);
      const context = await loadContext();
      setCheckingContext(false);

      if (context) {
        onContextReady();
        return;
      }

      onSetupRequired();
    }

    void check();
  }, [loadContext, onContextReady, onSetupRequired, onLoginRequired, setCheckingContext, user]);

  return (
    <ScreenPage>
      <Topbar title={t('context.checkingTitle')} />
      <CenteredScreenContent>
        <Card>
          <LoadingState
            title={t('context.checkingTitle')}
            description={t('context.checkingDescription')}
          />
        </Card>
      </CenteredScreenContent>
    </ScreenPage>
  );
}
