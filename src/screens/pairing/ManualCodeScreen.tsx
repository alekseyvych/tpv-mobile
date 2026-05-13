import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, TitleText, WarningText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  onSubmitCode: (code: string) => void;
  onBack: () => void;
};

function normalizeManualCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function formatManualCode(value: string): string {
  if (value.length <= 4) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 8)}`;
}

export function ManualCodeScreen({ onSubmitCode, onBack }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeManualCode(code);
  const formatted = formatManualCode(normalized);
  const isValid = normalized.length === 8;

  return (
    <ScreenPage>
      <Topbar title={t('pairing.manualTitle')} />
      <ScreenContent>
        <Card>
          <TitleText>{t('pairing.manualTitle')}</TitleText>
          <BodyText style={styles.description}>{t('pairing.manualDescription')}</BodyText>
          <Input
            value={formatted}
            autoCapitalize="characters"
            placeholder={t('pairing.manualPlaceholder')}
            onChangeText={setCode}
            editable={!submitting}
          />
          <View style={styles.row}>
            <Button title={t('common.back')} onPress={onBack} disabled={submitting} variant="secondary" />
            <Button 
              title={t('pairing.submitManualCode')} 
              onPress={() => {
                if (!submitting && isValid) {
                  setSubmitting(true);
                  onSubmitCode(formatted);
                  setSubmitting(false);
                }
              }} 
              disabled={!isValid || submitting}
            />
          </View>
          {!isValid ? <WarningText>{t('pairing.manualCodeHint')}</WarningText> : null}
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing.s3 },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
});
