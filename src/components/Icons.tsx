/**
 * Simple Icon Placeholder Components
 *
 * Since react-native-heroicons is not available, we create simple placeholder icons.
 * In production, replace these with actual icon libraries or SVG components.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/platform/theme';

interface IconProps {
  width: number;
  height: number;
  color: string;
  name?: string;
}

/**
 * Generic icon placeholder that displays a colored square with a letter
 */
export function Icon({ width, height, color, name = '•' }: IconProps) {
  return (
    <View
      style={[
        styles.iconContainer,
        { width, height, backgroundColor: color },
      ]}
    >
      <Text style={styles.iconText}>{name}</Text>
    </View>
  );
}

// Specific icon exports
export const ShoppingCartIcon = (props: IconProps) => <Icon {...props} name="🛒" />;
export const CubeIcon = (props: IconProps) => <Icon {...props} name="📦" />;
export const UserIcon = (props: IconProps) => <Icon {...props} name="👤" />;
export const BanknotesIcon = (props: IconProps) => <Icon {...props} name="💶" />;
export const TicketIcon = (props: IconProps) => <Icon {...props} name="🎫" />;
export const ChartBarIcon = (props: IconProps) => <Icon {...props} name="📊" />;
export const ReceiptPercentIcon = (props: IconProps) => <Icon {...props} name="🧾" />;
export const Squares2X2Icon = (props: IconProps) => <Icon {...props} name="⊞" />;
export const BuildingStorefrontIcon = (props: IconProps) => <Icon {...props} name="🏪" />;
export const UtensilsIcon = (props: IconProps) => <Icon {...props} name="🍴" />;
export const ChefHatIcon = (props: IconProps) => <Icon {...props} name="👨‍🍳" />;
export const CalendarIcon = (props: IconProps) => <Icon {...props} name="📅" />;
export const WrenchIcon = (props: IconProps) => <Icon {...props} name="🔧" />;
export const CurrencyEuroIcon = (props: IconProps) => <Icon {...props} name="€" />;
export const DocumentCheckIcon = (props: IconProps) => <Icon {...props} name="✓" />;
export const CheckCircleIcon = (props: IconProps) => <Icon {...props} name="✓" />;
export const ShieldCheckIcon = (props: IconProps) => <Icon {...props} name="🛡" />;
export const LockClosedIcon = (props: IconProps) => <Icon {...props} name="🔒" />;
export const UserGroupIcon = (props: IconProps) => <Icon {...props} name="👥" />;
export const Bars3Icon = (props: IconProps) => <Icon {...props} name="☰" />;
export const EllipsisVerticalIcon = (props: IconProps) => <Icon {...props} name="⋯" />;

const styles = StyleSheet.create({
  iconContainer: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
});
