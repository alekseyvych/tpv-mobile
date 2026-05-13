import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/components/theme/theme';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  style,
}: Props) {
  const buttonVariantStyle =
    variant === 'secondary'
      ? styles.buttonSecondary
      : variant === 'danger'
      ? styles.buttonDanger
      : styles.buttonPrimary;

  const textVariantStyle =
    variant === 'secondary'
      ? styles.textSecondary
      : variant === 'danger'
      ? styles.textDanger
      : styles.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        buttonVariantStyle,
        fullWidth ? styles.fullWidth : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
      disabled={disabled}
    >
      <Text style={[styles.text, textVariantStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s2,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.accentAction,
  },
  buttonDanger: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeBase,
    fontWeight: theme.typography.weightMedium,
    lineHeight: Math.round(theme.typography.sizeBase * theme.typography.leadingTight),
  },
  textPrimary: {
    color: theme.colors.textInverse,
  },
  textSecondary: {
    color: theme.colors.accentAction,
  },
  textDanger: {
    color: theme.colors.textInverse,
  },
});
