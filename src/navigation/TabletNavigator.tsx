/**
 * Tablet Sidebar Navigation
 *
 * Renders a collapsible left sidebar with modules organized by section.
 * Uses FlatList to display navigable modules.
 *
 * Layout (Expanded):
 * ┌──────────────┐
 * │ Home         │
 * │ Sale         │
 * │ Catalog      │
 * │              │
 * │ Fiscal       │
 * │ Analytics    │
 * │              │
 * │ Settings     │
 * │ Device Info  │
 * └──────────────┘
 *
 * Layout (Collapsed):
 * ┌────┐
 * │ home │
 * │ sale │
 * │ stock │
 * │ cash │
 * │ settings │
 * └────┘
 */

import { FlatList, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, theme } from '@/platform/theme';
import { LAYOUT } from '@/platform/breakpoints';
import { getModuleSections, getModulesBySection } from '@/navigation/modules';

interface TabletNavigatorProps {
  expanded: boolean;
  onToggleExpand: () => void;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isRouteEnabled: (route: string) => boolean;
}

export function TabletNavigator({
  expanded,
  onToggleExpand,
  currentRoute,
  onNavigate,
  isRouteEnabled,
}: TabletNavigatorProps) {
  const { t } = useTranslation();
  const sections = getModuleSections();

  return (
    <View style={styles.container}>
      {/* Navigation sections */}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item: section }) => {
          const modules = getModulesBySection(section.id as any);
          return (
            <View style={styles.section}>
              {expanded && (
                <Text style={styles.sectionLabel}>
                  {t(section.label)}
                </Text>
              )}
              {modules.map((module) => {
                const routeEnabled = isRouteEnabled(module.route);
                const disabled = Boolean(module.locked) || !routeEnabled;

                return (
                  <TouchableOpacity
                    key={module.id}
                    style={[
                      styles.moduleItem,
                      currentRoute === module.route ? styles.moduleItemActive : null,
                      disabled ? styles.moduleItemLocked : null,
                    ]}
                    onPress={() => onNavigate(module.route)}
                    disabled={disabled}
                  >
                    <View style={styles.iconWrap}>
                      <module.icon
                        width={LAYOUT.sidebarIconSize}
                        height={LAYOUT.sidebarIconSize}
                        color={colors.textInverse}
                      />
                    </View>
                    {expanded ? (
                      <View style={styles.moduleTextWrap}>
                        <Text style={styles.moduleLabel}>{t(module.label)}</Text>
                        {module.locked ? <Text style={styles.moduleLocked}>{t('layout.sidebar.requiresLicense')}</Text> : null}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
      />

      {/* Expand/Collapse toggle */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={onToggleExpand}
      >
        <Text style={styles.toggleLabel}>
          {expanded ? '◀' : '▶'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSidebar,
    paddingVertical: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: theme.typography.fontWeight.semibold,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  moduleItem: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: LAYOUT.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  moduleItemActive: {
    backgroundColor: colors.bgTopbar,
  },
  moduleItemLocked: {
    opacity: 0.6,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: LAYOUT.sidebarIconSize,
  },
  moduleTextWrap: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  moduleLabel: {
    color: colors.textInverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.normal,
  },
  moduleLocked: {
    color: colors.textMuted,
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  toggleButton: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: theme.typography.fontSize.lg,
    color: colors.textInverse,
  },
});
