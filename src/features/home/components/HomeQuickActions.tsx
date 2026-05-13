/**
 * Home Quick Actions Component
 *
 * Renders 3 primary action buttons (New Sale, New Product, New Customer).
 * Translates desktop dashboard quick actions to mobile cards.
 *
 * Phone: Stacks vertically, large touch targets
 * Tablet: 3 per row, grid layout
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import {
  ShoppingCartIcon,
  CubeIcon,
  UserIcon,
} from '@/components/Icons';

import { colors, theme } from '@/platform/theme';

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'newSale',
    label: 'home.actions.newSale',
    icon: ShoppingCartIcon,
    color: '#0058cc',
    route: 'Checkout',
  },
  {
    id: 'newProduct',
    label: 'home.actions.newProduct',
    icon: CubeIcon,
    color: '#007a4d',
    route: 'CatalogMain',
  },
  {
    id: 'newCustomer',
    label: 'home.actions.newCustomer',
    icon: UserIcon,
    color: '#996600',
    route: 'CustomersMain',
  },
];

interface HomeQuickActionsProps {
  isPhone: boolean;
}

export function HomeQuickActions({ isPhone }: HomeQuickActionsProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const handleAction = (route: string) => {
    navigation.navigate(route as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.quickActions.title')}</Text>

      {isPhone ? (
        // Phone: stack vertically
        <View>
          {QUICK_ACTIONS.map((action) => (
            <QuickActionButton
              key={action.id}
              action={action}
              isPhone={true}
              onPress={() => handleAction(action.route)}
            />
          ))}
        </View>
      ) : (
        // Tablet: 3-column grid
        <View style={styles.gridContainer}>
          {QUICK_ACTIONS.map((action) => (
            <View key={action.id} style={styles.gridItem}>
              <QuickActionButton
                action={action}
                isPhone={false}
                onPress={() => handleAction(action.route)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface QuickActionButtonProps {
  action: QuickAction;
  isPhone: boolean;
  onPress: () => void;
}

function QuickActionButton({ action, isPhone, onPress }: QuickActionButtonProps) {
  const { t } = useTranslation();
  const Icon = action.icon;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPhone ? styles.phoneButton : styles.tabletButton,
        { borderColor: action.color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon width={32} height={32} color={action.color} />
      <Text style={[styles.buttonLabel, { color: action.color }]}>
        {t(action.label)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing['2xl'],
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  button: {
    borderWidth: 2,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPanel,
    marginBottom: theme.spacing.md,
  },
  phoneButton: {
    minHeight: 80,
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
  },
  tabletButton: {
    minHeight: 100,
    flexDirection: 'column',
  },
  buttonLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.md,
    marginLeft: theme.spacing.md,
    textAlign: 'center',
  },
});
