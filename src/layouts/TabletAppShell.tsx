/**
 * Tablet App Shell with Sidebar Navigation
 *
 * Renders app content with:
 * - Topbar (full width)
 * - Sidebar navigation (collapsible, 240px expanded / 64px collapsed)
 * - Content area (fills remaining space)
 *
 * Layout structure:
 * ┌──────────────────────────────────┐
 * │ Topbar (56px, full width)        │
 * ├─────┬──────────────────────────┤
 * │ │                              │
 * │ │  Sidebar  │  Content (scroll)│
 * │ │ (240px)   │                 │
 * │ │           │                 │
 * │ │ expanded  │                 │
 * │ │ or        │                 │
 * │ │ 64px      │                 │
 * │ │ collapsed │                 │
 * │ │           │                 │
 * └─────┴──────────────────────────┘
 */

import { type ReactNode, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/components/theme/theme';
import { LAYOUT } from '@/platform/breakpoints';
import { TabletNavigator } from '@/navigation/TabletNavigator';

interface TabletAppShellProps {
  children: ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isRouteEnabled: (route: string) => boolean;
}

export function TabletAppShell({
  children,
  currentRoute,
  onNavigate,
  isRouteEnabled,
}: TabletAppShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const sidebarWidth = sidebarExpanded
    ? LAYOUT.sidebarExpandedWidth
    : LAYOUT.sidebarCollapsedWidth;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <View testID="tablet-shell-main" style={styles.mainContainer}>
        <View
          testID="tablet-shell-sidebar"
          style={[
            styles.sidebarContainer,
            { width: sidebarWidth },
          ]}
        >
          <TabletNavigator
            expanded={sidebarExpanded}
            onToggleExpand={() => setSidebarExpanded(!sidebarExpanded)}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            isRouteEnabled={isRouteEnabled}
          />
        </View>

        <View testID="tablet-shell-content" style={styles.contentContainer}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPage,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    backgroundColor: theme.colors.bgSidebar,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.bgPage,
  },
});
