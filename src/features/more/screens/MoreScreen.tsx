/**
 * More Screen - Phone Overflow Navigation
 *
 * Displayed as a tab on phone bottom navigation.
 * Shows all modules not in the primary 5-item bottom bar.
 * Allows quick navigation to secondary modules.
 */

import React from 'react';
import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors, theme } from '@/platform/theme';
import { LAYOUT } from '@/platform/breakpoints';
import {
  getModuleSections,
  getModulesBySection,
} from '@/navigation/modules';

type MoreScreenProps = {
  onNavigate: (route: string) => void;
  isRouteEnabled: (route: string) => boolean;
};

export function MoreScreen({ onNavigate, isRouteEnabled }: MoreScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sections = getModuleSections();

  // Phone-only exclusions requested for the More overflow menu.
  const HIDDEN_IN_MOBILE_MORE = new Set([
    'catalog',
    'inventory',
    'customers',
    'restaurant',
    'workshop',
    'fiscal',
    'analytics',
    'sales-receipts',
    'users',
    'roles',
    'licenses',
    'audit',
  ]);

  // Get all modules organized by section
  const sectionData = sections
    .map((section) => ({
      title: section.label,
      data: getModulesBySection(section.id as any).filter((module) => !HIDDEN_IN_MOBILE_MORE.has(module.id)),
    }))
    .filter((section) => section.data.length > 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.headerTitle}>{t('layout.more')}</Text>
      </View>
      <SectionList
        sections={sectionData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: module }) => {
          const routeEnabled = isRouteEnabled(module.route);
          const disabled = module.locked || !routeEnabled;

          return (
            <TouchableOpacity
              style={[styles.moduleItem, disabled ? styles.moduleItemDisabled : null]}
              onPress={() => {
                if (disabled) {
                  Alert.alert(
                    t('layout.sidebar.noAccessTitle'),
                    t('layout.sidebar.noAccessMessage', { module: t(module.label) }),
                  );
                  return;
                }
                onNavigate(module.route);
              }}
            >
              <module.icon
                width={24}
                height={24}
                color={colors.accentAction}
              />
              <View style={styles.moduleContent}>
                <Text style={styles.moduleLabel}>
                  {t(module.label)}
                </Text>
                {module.locked ? (
                  <Text style={styles.moduleLocked}>{t('layout.sidebar.requiresLicense')}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>
            {t(title)}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    paddingHorizontal: LAYOUT.contentPaddingHorizontal,
    paddingBottom: theme.spacing.md,
    backgroundColor: colors.bgPage,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: LAYOUT.contentPaddingHorizontal,
    paddingVertical: theme.spacing.lg,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    backgroundColor: colors.bgPage,
  },
  moduleItem: {
    paddingHorizontal: LAYOUT.contentPaddingHorizontal,
    paddingVertical: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: LAYOUT.minTouchTarget,
  },
  moduleItemDisabled: {
    opacity: 0.6,
  },
  moduleContent: {
    flex: 1,
  },
  moduleLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  moduleLocked: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
