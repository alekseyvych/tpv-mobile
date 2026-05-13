import { View, StyleSheet, type ViewProps } from 'react-native';

import { theme } from '@/components/theme/theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.s4,
    ...theme.shadow.sm,
  },
});
