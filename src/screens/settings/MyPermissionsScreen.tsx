import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { getRolePermissions } from '@/api/roles.api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useAuthStore } from '@/store/auth.store';
import {
  buildPermissionDisplayLabel,
  countDangerousPermissions,
  groupPermissionsByResource,
  normalizePermissionKey,
} from '@/utils/permission-display';

type Props = {
  onBack?: () => void;
  embedded?: boolean;
};

function normalizeRoleName(roleName: string): string {
  return roleName.trim().toUpperCase().replace(/-/g, '_');
}

function dedupePermissions(permissions: string[]): string[] {
  const byKey = new Map<string, string>();

  permissions.forEach((permission) => {
    const normalized = normalizePermissionKey(permission);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, normalized);
    }
  });

  return Array.from(byKey.values());
}

function primaryRole(roles: string[]): string {
  return roles[0] ?? '-';
}

function MyPermissionsScreenContent({ onBack, embedded = false }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles ?? []);
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const [hydratedPermissions, setHydratedPermissions] = useState<string[]>([]);
  const [hydrationLoading, setHydrationLoading] = useState(false);
  const [hydrationError, setHydrationError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});
  const [showRawKeys, setShowRawKeys] = useState(false);

  const refreshHydratedPermissions = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolvePermissions() {
      const directPermissions = dedupePermissions(permissions);
      if (directPermissions.length > 0) {
        setHydratedPermissions(directPermissions);
        setHydrationLoading(false);
        setHydrationError(false);
        return;
      }

      const normalizedRoles = Array.from(new Set(roles.map(normalizeRoleName).filter(Boolean)));
      if (normalizedRoles.length === 0) {
        setHydratedPermissions([]);
        setHydrationLoading(false);
        setHydrationError(false);
        return;
      }

      setHydrationLoading(true);
      setHydrationError(false);

      const settled = await Promise.allSettled(
        normalizedRoles.map((role) => getRolePermissions(role)),
      );

      if (cancelled) return;

      const resolvedPermissions = dedupePermissions(
        settled.flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : [])),
      );
      const hasFailure = settled.some((entry) => entry.status === 'rejected');

      setHydratedPermissions(resolvedPermissions);
      setHydrationError(hasFailure && resolvedPermissions.length === 0);
      setHydrationLoading(false);
    }

    void resolvePermissions();

    return () => {
      cancelled = true;
    };
  }, [permissions, roles, reloadToken]);

  const effectivePermissions = hydratedPermissions;
  const groups = useMemo(() => groupPermissionsByResource(effectivePermissions, t), [effectivePermissions, t]);
  const dangerousCount = useMemo(() => countDangerousPermissions(effectivePermissions), [effectivePermissions]);
  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || '-';

  const toggleResource = useCallback((resourceKey: string) => {
    setExpandedResources((current) => ({
      ...current,
      [resourceKey]: !current[resourceKey],
    }));
  }, []);

  const content = (
    <>
      <Card>
        <SectionHeader
          title={t('settings.myPermissions.title')}
          subtitle={t('settings.myPermissions.description')}
        />
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <MetaText>{t('settings.myPermissions.userLabel')}</MetaText>
            <BodyText>{name}</BodyText>
          </View>
          <View style={styles.summaryCell}>
            <MetaText>{t('settings.myPermissions.emailLabel')}</MetaText>
            <BodyText>{user?.email ?? '-'}</BodyText>
          </View>
          <View style={styles.summaryCell}>
            <MetaText>{t('settings.myPermissions.primaryRoleLabel')}</MetaText>
            <BodyText>{primaryRole(roles)}</BodyText>
          </View>
          <View style={styles.summaryCell}>
            <MetaText>{t('settings.myPermissions.roleCountLabel')}</MetaText>
            <BodyText>{String(roles.length)}</BodyText>
          </View>
          <View style={styles.summaryCell}>
            <MetaText>{t('settings.myPermissions.permissionCountLabel')}</MetaText>
            <BodyText>{t('settings.myPermissions.permissionCount', { count: effectivePermissions.length })}</BodyText>
          </View>
          <View style={styles.summaryCell}>
            <MetaText>{t('settings.myPermissions.resourceCountLabel')}</MetaText>
            <BodyText>{t('settings.myPermissions.resourceCount', { count: groups.length })}</BodyText>
          </View>
          <View style={styles.summaryCell}>
            <MetaText>{t('settings.myPermissions.elevatedCountLabel')}</MetaText>
            <BodyText>{t('settings.myPermissions.elevatedCount', { count: dangerousCount })}</BodyText>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.permissionsHeader}>
          <TitleText style={styles.tableTitle}>{t('settings.myPermissions.assignedTitle')}</TitleText>
          <MetaText style={styles.tableCount}>{t('settings.myPermissions.permissionCount', { count: effectivePermissions.length })}</MetaText>
        </View>
        {dangerousCount > 0 ? (
          <View style={styles.elevatedNotice}>
            <BodyText>{t('settings.myPermissions.elevatedSummary', { count: dangerousCount })}</BodyText>
          </View>
        ) : null}
        {hydrationLoading ? (
          <BodyText>{t('settings.myPermissions.loadingPermissions')}</BodyText>
        ) : hydrationError ? (
          <View style={styles.errorState}>
            <BodyText>{t('settings.myPermissions.loadError')}</BodyText>
            <Button title={t('settings.myPermissions.retry')} onPress={refreshHydratedPermissions} variant="secondary" />
          </View>
        ) : groups.length === 0 ? (
          <BodyText>{t('settings.myPermissions.empty')}</BodyText>
        ) : (
          groups.map((group) => (
            <View key={group.resourceKey} style={styles.groupCard}>
              <Pressable
                style={styles.groupHeader}
                onPress={() => toggleResource(group.resourceKey)}
                accessibilityRole="button"
              >
                <TitleText style={styles.groupTitle}>{group.resourceLabel}</TitleText>
                <MetaText style={styles.groupCount}>
                  {t('settings.myPermissions.groupCount', { count: group.permissions.length })}
                </MetaText>
              </Pressable>
              {expandedResources[group.resourceKey] !== false ? (
                <View style={styles.chipWrap}>
                  {group.permissions.map((permission) => {
                    const labels = buildPermissionDisplayLabel(permission.key, t);
                    const dangerous = countDangerousPermissions([permission.key]) > 0;
                    return (
                      <View
                        key={permission.key}
                        style={dangerous ? styles.permissionChipDangerous : styles.permissionChip}
                      >
                        <BodyText style={styles.permissionChipText}>{labels.actionLabel}</BodyText>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ))
        )}

        <View style={styles.rawSection}>
          <Pressable
            style={styles.rawToggle}
            onPress={() => setShowRawKeys((current) => !current)}
            accessibilityRole="button"
          >
            <MetaText>{t('settings.myPermissions.advancedRaw')}</MetaText>
          </Pressable>
          {showRawKeys ? (
            <View style={styles.rawList}>
              {effectivePermissions.map((permissionKey) => (
                <MetaText key={permissionKey} style={styles.rawItem}>
                  {permissionKey}
                </MetaText>
              ))}
            </View>
          ) : null}
        </View>
      </Card>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScreenPage>
      <Topbar title={t('settings.myPermissions.title')} onBack={onBack} />
      <ScreenContent>{content}</ScreenContent>
    </ScreenPage>
  );
}

export function MyPermissionsScreen({ onBack, embedded = false }: Props) {
  return <MyPermissionsScreenContent onBack={onBack} embedded={embedded} />;
}

const styles = StyleSheet.create({
  summaryGrid: {
    gap: theme.spacing.s2,
  },
  summaryCell: {
    backgroundColor: theme.colors.bgPage,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
  },
  permissionsHeader: {
    alignItems: 'flex-start',
    marginBottom: theme.spacing.s2,
  },
  tableTitle: {
    marginBottom: 0,
  },
  tableCount: {
    marginTop: theme.spacing.s1,
  },
  errorState: {
    gap: theme.spacing.s2,
  },
  elevatedNotice: {
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
  },
  groupCard: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginTop: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.s2,
    marginBottom: theme.spacing.s2,
  },
  groupTitle: {
    fontSize: theme.typography.sizeLg,
    marginBottom: 0,
  },
  groupCount: {
    marginBottom: 0,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
    marginTop: theme.spacing.s1,
  },
  permissionChip: {
    backgroundColor: theme.colors.bgPage,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: theme.spacing.s1,
  },
  permissionChipDangerous: {
    backgroundColor: theme.colors.warning + '1A',
    borderColor: theme.colors.warning,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: theme.spacing.s1,
  },
  permissionChipText: {
    marginBottom: 0,
    fontSize: theme.typography.sizeSm,
  },
  rawSection: {
    marginTop: theme.spacing.s3,
    paddingTop: theme.spacing.s2,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
  },
  rawToggle: {
    paddingVertical: theme.spacing.s1,
  },
  rawList: {
    gap: theme.spacing.s1,
    marginTop: theme.spacing.s1,
  },
  rawItem: {
    fontFamily: 'monospace',
    marginBottom: 0,
  },
});