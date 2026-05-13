import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/components/theme/theme';

type Props = {
  children: ReactNode;
};

export function KitchenDisplayShell({ children }: Props) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <View testID="kitchen-shell-content" style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgPage,
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
