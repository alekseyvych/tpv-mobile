import { View, type ViewProps, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/components/theme/theme';

export function ScreenPage({ style, ...props }: ViewProps) {
  return <SafeAreaView {...props} edges={['left', 'right', 'bottom']} style={[styles.page, style]} />;
}

export function ScreenContent({ style, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();

  return <View {...props} style={[styles.content, { paddingBottom: theme.spacing.s4 + insets.bottom }, style]} />;
}

export function CenteredScreenContent({ style, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[styles.centeredContent, { paddingBottom: theme.spacing.s4 + insets.bottom }, style]}
    />
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bgPage,
  },
  content: {
    flex: 1,
    padding: theme.spacing.s4,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.s4,
    gap: theme.spacing.s2,
  },
});
