import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/components/theme/theme';

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
  const insets = useSafeAreaInsets();

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
});
