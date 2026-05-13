import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { theme } from '@/components/theme/theme';

export function Input({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.colors.textMuted}
      style={[styles.input, focused ? styles.inputFocused : null, style]}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.bgPanel,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontUi,
    fontSize: theme.typography.sizeBase,
    minHeight: 44,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
  },
  inputFocused: {
    borderColor: theme.colors.accentAction,
    borderWidth: 2,
  },
});
