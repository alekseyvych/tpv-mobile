import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { theme } from '@/components/theme/theme';

type Props = {
  currentLanguage: 'en' | 'es';
  onSelect: (language: 'en' | 'es') => void;
};

export function LanguageSelector({ currentLanguage, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('settings.languageLabel')}</Text>
      <View style={styles.row}>
        <Button
          title={currentLanguage === 'en' ? t('settings.languageEnglishSelected') : t('settings.languageEnglish')}
          onPress={() => onSelect('en')}
          variant={currentLanguage === 'en' ? 'primary' : 'secondary'}
        />
        <Button
          title={currentLanguage === 'es' ? t('settings.languageSpanishSelected') : t('settings.languageSpanish')}
          onPress={() => onSelect('es')}
          variant={currentLanguage === 'es' ? 'primary' : 'secondary'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.s2,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizeMd,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
  },
});
