import { Pressable, StyleSheet, View } from 'react-native';

import { BodyText, MetaText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
};

export function QuickActionCard({ title, subtitle, onPress, disabled = false }: Props) {
  return (
    <Pressable
      style={[styles.card, disabled ? styles.cardDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <View>
        <BodyText style={styles.title}>{title}</BodyText>
        {subtitle ? <MetaText style={styles.subtitle}>{subtitle}</MetaText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    minHeight: 76,
    padding: theme.spacing.s3,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weightSemibold,
    marginBottom: theme.spacing.s1,
  },
  subtitle: {
    marginBottom: 0,
  },
});
