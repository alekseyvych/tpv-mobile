import { StyleSheet, View } from 'react-native';

import { BodyText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

type Props = {
  label: string;
  tone?: StatusTone;
};

const toneStyles = {
  neutral: { bg: theme.colors.bgPanel, border: theme.colors.border, text: theme.colors.textSecondary },
  info: { bg: '#e9f2ff', border: theme.colors.info, text: theme.colors.info },
  success: { bg: '#e7f7f0', border: theme.colors.success, text: theme.colors.success },
  warning: { bg: '#fff6e6', border: theme.colors.warning, text: theme.colors.warning },
  error: { bg: '#fdecec', border: theme.colors.error, text: theme.colors.error },
} as const;

export function StatusPill({ label, tone = 'neutral' }: Props) {
  const selected = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: selected.bg, borderColor: selected.border }]}> 
      <BodyText style={[styles.label, { color: selected.text }]}>{label}</BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: theme.spacing.s1,
  },
  label: {
    fontSize: theme.typography.sizeSm,
    fontWeight: theme.typography.weightSemibold,
    marginBottom: 0,
  },
});
