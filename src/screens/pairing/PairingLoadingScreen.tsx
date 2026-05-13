import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { CenteredScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';

export function PairingLoadingScreen() {
  const { t } = useTranslation();

  return (
    <ScreenPage>
      <Topbar title={t('pairing.loadingTitle')} />
      <CenteredScreenContent>
        <Card>
          <LoadingState
            title={t('pairing.loadingTitle')}
            description={t('pairing.loadingDescription')}
          />
        </Card>
      </CenteredScreenContent>
    </ScreenPage>
  );
}
