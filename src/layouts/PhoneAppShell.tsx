/**
 * Phone App Shell with Bottom Navigation
 *
 * Renders app content with:
 * - Topbar (small, minimal)
 * - Content area (scrollable)
 * - Bottom navigation bar (5-6 primary modules + More)
 *
 * Layout structure:
 * ┌─────────────────────┐
 * │ Topbar (56px)       │
 * ├─────────────────────┤
 * │                     │
 * │  Content (scroll)   │
 * │                     │
 * ├─────────────────────┤
 * │ Bottom Nav (60px)   │
 * └─────────────────────┘
 */

import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/components/theme/theme';
import { PhoneNavigator } from '@/navigation/PhoneNavigator';

interface PhoneAppShellProps {
  children: ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isRouteEnabled: (route: string) => boolean;
}

export function PhoneAppShell({
  children,
  currentRoute,
  onNavigate,
  isRouteEnabled,
}: PhoneAppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View testID="phone-shell-content" style={styles.contentContainer}>
        {children}
      </View>
      <PhoneNavigator currentRoute={currentRoute} onNavigate={onNavigate} isRouteEnabled={isRouteEnabled} />
      <View testID="phone-shell-safe-bottom" style={{ height: insets.bottom }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPage,
  },
  contentContainer: {
    flex: 1,
  }
});
