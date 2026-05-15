import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import type { QuickReentryMethod, SessionPolicyConfig } from '@/store/session-policy.store';
import { useSessionPolicyStore } from '@/store/session-policy.store';

type Props = {
  onBack?: () => void;
  embedded?: boolean;
};

const QUICK_REENTRY_OPTIONS: QuickReentryMethod[] = ['PIN_ONLY', 'PIN_OR_PASSWORD', 'PASSWORD_ONLY'];

function splitMinSec(totalMinutes: number): { minutes: number; seconds: number } {
  const totalSecs = Math.max(1, Math.round(totalMinutes * 60));
  return { minutes: Math.floor(totalSecs / 60), seconds: totalSecs % 60 };
}

function combineMinSec(minutes: number, seconds: number): number {
  const totalSecs = minutes * 60 + seconds;
  return Math.max(10, Math.round(totalSecs / 10) * 10) / 60;
}

type FormValues = {
  shortMin: string;
  shortSec: string;
  longMin: string;
  longSec: string;
};

function validate(
  values: FormValues,
  quickReentry: QuickReentryMethod,
  t: (key: string) => string,
): string | null {
  const sMin = parseInt(values.shortMin, 10);
  const sSec = parseInt(values.shortSec, 10);
  const lMin = parseInt(values.longMin, 10);
  const lSec = parseInt(values.longSec, 10);

  if (isNaN(sMin) || isNaN(sSec) || isNaN(lMin) || isNaN(lSec)) {
    return t('inactivity.errorNotNumber');
  }
  if (sSec < 0 || sSec > 59 || lSec < 0 || lSec > 59) {
    return t('inactivity.errorSecondsRange');
  }
  if (sSec % 10 !== 0 || lSec % 10 !== 0) {
    return t('inactivity.errorSecondsStep');
  }
  const shortTotal = sMin * 60 + sSec;
  const longTotal = lMin * 60 + lSec;
  if (shortTotal === 0) return t('inactivity.errorShortPositive');
  if (longTotal === 0) return t('inactivity.errorLongPositive');
  if (longTotal <= shortTotal) return t('inactivity.errorLongMustExceedShort');

  void quickReentry; // validated by picker selection
  return null;
}

export function InactivitySettingsScreen({ onBack, embedded = false }: Props) {
  const { t } = useTranslation();
  const { config, load, save } = useSessionPolicyStore();

  const [values, setValues] = useState<FormValues>(() => {
    const s = splitMinSec(config.defaultProfile.shortInactivityMinutes);
    const l = splitMinSec(config.defaultProfile.longInactivityMinutes);
    return {
      shortMin: String(s.minutes),
      shortSec: String(s.seconds),
      longMin: String(l.minutes),
      longSec: String(l.seconds),
    };
  });
  const [quickReentry, setQuickReentry] = useState<QuickReentryMethod>(
    config.defaultProfile.quickReentryMethod,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load().then(() => {
      const s = splitMinSec(config.defaultProfile.shortInactivityMinutes);
      const l = splitMinSec(config.defaultProfile.longInactivityMinutes);
      setValues({
        shortMin: String(s.minutes),
        shortSec: String(s.seconds),
        longMin: String(l.minutes),
        longSec: String(l.seconds),
      });
      setQuickReentry(config.defaultProfile.quickReentryMethod);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    const validationError = validate(values, quickReentry, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const newConfig: SessionPolicyConfig = {
      defaultProfile: {
        shortInactivityMinutes: combineMinSec(
          parseInt(values.shortMin, 10),
          parseInt(values.shortSec, 10),
        ),
        longInactivityMinutes: combineMinSec(
          parseInt(values.longMin, 10),
          parseInt(values.longSec, 10),
        ),
        quickReentryMethod: quickReentry,
      },
    };

    void save(newConfig).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function field(
    label: string,
    minKey: keyof FormValues,
    secKey: keyof FormValues,
  ) {
    return (
      <View style={styles.fieldRow}>
        <BodyText style={styles.fieldLabel}>{label}</BodyText>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <MetaText>{t('inactivity.minutes')}</MetaText>
            <TextInput
              style={styles.numInput}
              keyboardType="number-pad"
              value={values[minKey]}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [minKey]: v }))}
              maxLength={3}
            />
          </View>
          <View style={styles.inputGroup}>
            <MetaText>{t('inactivity.seconds')}</MetaText>
            <TextInput
              style={styles.numInput}
              keyboardType="number-pad"
              value={values[secKey]}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [secKey]: v }))}
              maxLength={2}
            />
          </View>
          <MetaText style={styles.stepHint}>{t('inactivity.secondsStepHint')}</MetaText>
        </View>
      </View>
    );
  }

  const content = (
    <Card>
            <TitleText>{t('inactivity.policyTitle')}</TitleText>
            <BodyText>{t('inactivity.policyDescription')}</BodyText>

            {field(t('inactivity.shortLabel'), 'shortMin', 'shortSec')}
            {field(t('inactivity.longLabel'), 'longMin', 'longSec')}

            {/* Quick re-entry method */}
            <View style={styles.fieldRow}>
              <BodyText style={styles.fieldLabel}>{t('inactivity.quickReentryLabel')}</BodyText>
              {QUICK_REENTRY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionBtn, quickReentry === opt && styles.optionBtnActive]}
                  onPress={() => setQuickReentry(opt)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: quickReentry === opt }}
                >
                  <BodyText style={quickReentry === opt ? styles.optionTextActive : undefined}>
                    {t(`inactivity.quickReentry.${opt}`)}
                  </BodyText>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <ErrorText>{error}</ErrorText> : null}
            {saved ? <BodyText style={styles.savedMsg}>{t('inactivity.saved')}</BodyText> : null}

            {embedded ? (
              <View style={styles.btnRow}>
                <Button title={t('inactivity.save')} onPress={handleSave} fullWidth />
              </View>
            ) : null}
          </Card>
  );

  if (embedded) {
    return <ScrollView>{content}</ScrollView>;
  }

  return (
    <ScreenPage>
      <Topbar
        title={t('inactivity.title')}
        onBack={onBack}
        rightActionLabel={t('inactivity.save')}
        onRightAction={handleSave}
      />
      <ScrollView>
        <ScreenContent>{content}</ScreenContent>
      </ScrollView>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  fieldRow: { marginBottom: theme.spacing.s4 },
  fieldLabel: { fontWeight: theme.typography.weightBold, marginBottom: theme.spacing.s2 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.s3, flexWrap: 'wrap' },
  inputGroup: { alignItems: 'center' },
  numInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.s2,
    width: 64,
    textAlign: 'center',
    fontSize: theme.typography.sizeMd,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.bgPanel,
  },
  stepHint: { alignSelf: 'flex-end', marginBottom: theme.spacing.s1 },
  optionBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.s2,
    marginBottom: theme.spacing.s1,
  },
  optionBtnActive: {
    borderColor: theme.colors.accentAction,
    backgroundColor: theme.colors.accentAction,
  },
  optionTextActive: { color: theme.colors.textOnAccent },
  savedMsg: { color: theme.colors.success },
  btnRow: { marginTop: theme.spacing.s2 },
});
