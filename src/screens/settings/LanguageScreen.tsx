import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { useSettings } from '@/hooks/useSettings';

type Props = {
  onBack?: () => void;
  embedded?: boolean;
};

export function LanguageScreen({ onBack, embedded = false }: Props) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useSettings();

  const content = (
    <Card>
      <SectionHeader
        title={t('settings.languageTitle')}
        subtitle={t('settings.languageDescription')}
      />
      <LanguageSelector currentLanguage={language === 'es' ? 'es' : 'en'} onSelect={(value) => void changeLanguage(value)} />
    </Card>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScreenPage>
      <Topbar title={t('settings.languageTitle')} onBack={onBack} />
      <ScreenContent>{content}</ScreenContent>
    </ScreenPage>
  );
}
