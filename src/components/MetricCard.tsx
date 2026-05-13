import { StyleSheet, View } from 'react-native';

import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricCard({ label, value, hint }: Props) {
  return (
    <View style={styles.card}>
      <BodyText style={styles.label}>{label}</BodyText>
      <TitleText style={styles.value}>{value}</TitleText>
      {hint ? <BodyText style={styles.hint}>{hint}</BodyText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    minHeight: 96,
    padding: theme.spacing.s3,
  },
  label: {
    marginBottom: theme.spacing.s1,
  },
  value: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.s1,
  },
  hint: {
    marginBottom: 0,
  },
});
