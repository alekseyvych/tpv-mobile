import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserIcon } from '@/components/Icons';
import { useTopbarUserMenu } from '@/components/header/TopbarUserMenuContext';
import { theme } from '@/components/theme/theme';
import { useAuthStore } from '@/store/auth.store';

type Props = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  rightActionLabel?: string;
  onRightAction?: () => void;
  rightActionDisabled?: boolean;
};

export function Topbar({
  title,
  onBack,
  backLabel = '<',
  rightActionLabel,
  onRightAction,
  rightActionDisabled = false,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenu = useTopbarUserMenu();
  const user = useAuthStore((s) => s.user);
  const userName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || '';

  return (
    <View
      testID="topbar-container"
      style={[
        styles.container,
        { minHeight: theme.layout.topbarHeight + insets.top, paddingTop: theme.spacing.s3 + insets.top },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.actionBtn}>
              <Text style={styles.actionText}>{backLabel}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
        </View>
        <View style={[styles.side, styles.sideRight]}>
          {rightActionLabel && onRightAction ? (
            <Pressable
              accessibilityRole="button"
              disabled={rightActionDisabled}
              onPress={onRightAction}
              style={[styles.actionBtn, rightActionDisabled && styles.actionBtnDisabled]}
            >
              <Text style={styles.actionText}>{rightActionLabel}</Text>
            </Pressable>
          ) : userName ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!userMenu) return;
                setMenuOpen((open) => !open);
              }}
              style={styles.userIdentity}
              testID="topbar-user-trigger"
            >
              <View style={styles.avatarWrap}>
                <UserIcon width={16} height={16} color={theme.colors.textInverse} />
              </View>
              <Text numberOfLines={1} style={styles.userName}>{userName}</Text>
            </Pressable>
          ) : null}

          {menuOpen && userMenu ? (
            <View style={styles.menuPopover} testID="topbar-user-menu">
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuOpen(false);
                  if (userMenu.swapBlocked) return;
                  userMenu.onSwap();
                }}
                style={[styles.menuItem, userMenu.swapBlocked && styles.menuItemDisabled]}
              >
                <Text style={styles.menuItemText}>{t('header.userMenu.swapAccount')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuOpen(false);
                  userMenu.onLogout();
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>{t('header.userMenu.logout')}</Text>
              </Pressable>
              {userMenu.swapBlocked ? <Text style={styles.blockedText}>{userMenu.swapBlockedMessage}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
  },
  side: {
    minWidth: 52,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
    minWidth: 120,
    position: 'relative',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.textInverse,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeXl,
    fontWeight: theme.typography.weightBold,
    lineHeight: Math.round(theme.typography.sizeXl * theme.typography.leadingTight),
    textAlign: 'center',
  },
  actionBtn: {
    minHeight: 32,
    paddingHorizontal: theme.spacing.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionText: {
    color: theme.colors.textInverse,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeMd,
    fontWeight: theme.typography.weightBold,
  },
  userIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.s2,
    maxWidth: 160,
  },
  avatarWrap: {
    alignItems: 'center',
    borderColor: theme.colors.textInverse,
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  userName: {
    color: theme.colors.textInverse,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeSm,
    fontWeight: theme.typography.weightMedium,
  },
  menuPopover: {
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minWidth: 190,
    padding: theme.spacing.s1,
    position: 'absolute',
    right: 0,
    top: 34,
    zIndex: 10,
  },
  menuItem: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: theme.spacing.s2,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeSm,
    fontWeight: theme.typography.weightMedium,
  },
  blockedText: {
    color: theme.colors.error,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeXs,
    marginTop: theme.spacing.s1,
    paddingHorizontal: theme.spacing.s2,
  },
});
