import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { UserIcon } from '@/components/Icons';
import { BodyText, MetaText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import type { AuthUser } from '@/types/store';

type Props = {
  user: AuthUser | null;
  onPress: () => void;
};

function displayName(user: AuthUser | null): string {
  if (!user) return '';
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName.length > 0) return fullName;
  if (typeof user.email === 'string' && user.email.length > 0) return user.email;
  return user.id;
}

export function ShellUserIdentityBar({ user, onPress }: Props) {
  const { t } = useTranslation();

  const userName = useMemo(() => displayName(user), [user]);

  return (
    <View testID="shell-user-header" style={styles.container}>
      <MetaText style={styles.title}>{t('common.appName')}</MetaText>
      <Pressable testID="shell-user-trigger" onPress={onPress} style={styles.userButton}>
        <View style={styles.avatarWrap}>
          <UserIcon width={18} height={18} color={theme.colors.textPrimary} />
        </View>
        <BodyText style={styles.userName}>{userName}</BodyText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgPanel,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
  },
  title: {
    marginBottom: 0,
  },
  userButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.s2,
    maxWidth: '72%',
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgPage,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  userName: {
    marginBottom: 0,
  },
});
