import { Text, type TextProps, StyleSheet } from 'react-native';

import { theme } from '@/components/theme/theme';

type AppTextProps = TextProps;

export function TitleText({ style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles.title, style]} />;
}

export function BodyText({ style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles.body, style]} />;
}

export function MetaText({ style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles.meta, style]} />;
}

export function ErrorText({ style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles.error, style]} />;
}

export function WarningText({ style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles.warning, style]} />;
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeXl,
    fontWeight: theme.typography.weightBold,
    lineHeight: Math.round(theme.typography.sizeXl * theme.typography.leadingTight),
    marginBottom: theme.spacing.s2,
  },
  body: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeBase,
    fontWeight: theme.typography.weightRegular,
    lineHeight: Math.round(theme.typography.sizeBase * theme.typography.leadingNormal),
    marginBottom: theme.spacing.s2,
  },
  meta: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeSm,
    fontWeight: theme.typography.weightMedium,
    lineHeight: Math.round(theme.typography.sizeSm * theme.typography.leadingNormal),
    marginBottom: theme.spacing.s2,
  },
  error: {
    color: theme.colors.error,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeSm,
    fontWeight: theme.typography.weightMedium,
    lineHeight: Math.round(theme.typography.sizeSm * theme.typography.leadingNormal),
    marginTop: theme.spacing.s2,
  },
  warning: {
    color: theme.colors.warning,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeSm,
    fontWeight: theme.typography.weightMedium,
    lineHeight: Math.round(theme.typography.sizeSm * theme.typography.leadingNormal),
    marginTop: theme.spacing.s2,
  },
});
