import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/components/theme/theme';

type Props = { title: string };

export function Topbar({ title }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View testID="topbar-container" style={[styles.container, { minHeight: theme.layout.topbarHeight + insets.top, paddingTop: theme.spacing.s3 + insets.top }]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgTopbar,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.s4,
    paddingBottom: theme.spacing.s3,
  },
  title: {
    color: theme.colors.textInverse,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeXl,
    fontWeight: theme.typography.weightBold,
    lineHeight: Math.round(theme.typography.sizeXl * theme.typography.leadingTight),
  },
});
