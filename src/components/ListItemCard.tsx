import { View, type ViewProps, StyleSheet } from 'react-native';

import { theme } from '@/components/theme/theme';

export function ListItemCard({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgPanel,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.s3,
    marginBottom: theme.spacing.s2,
  },
});
