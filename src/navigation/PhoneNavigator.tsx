import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  BuildingStorefrontIcon,
  ChefHatIcon,
  EllipsisVerticalIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
} from '@/components/Icons';
import { BodyText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  currentRoute: string;
  onNavigate: (route: string) => void;
};

function resolveActiveTab(currentRoute: string): 'home' | 'pos' | 'dining' | 'kitchen' | 'more' {
  if (currentRoute === 'Home') return 'home';
  if (['Checkout', 'Cart', 'Payment', 'Receipt'].includes(currentRoute)) return 'pos';
  if (['DiningFloor', 'TableDetail'].includes(currentRoute)) return 'dining';
  if (currentRoute === 'KitchenDisplay') return 'kitchen';
  return 'more';
}

export function PhoneNavigator({ currentRoute, onNavigate }: Props) {
  const { t } = useTranslation();
  const activeTab = resolveActiveTab(currentRoute);

  const tabs = [
    { key: 'home', label: t('common.home'), route: 'Home', icon: Squares2X2Icon },
    { key: 'pos', label: t('pos.navTitle'), route: 'Checkout', icon: ShoppingCartIcon },
    { key: 'dining', label: t('dining.floorNav'), route: 'DiningFloor', icon: BuildingStorefrontIcon },
    { key: 'kitchen', label: t('kitchen.navTitle'), route: 'KitchenDisplay', icon: ChefHatIcon },
    { key: 'more', label: t('layout.more'), route: 'More', icon: EllipsisVerticalIcon },
  ] as const;

  return (
    <View style={styles.tabBar} testID="phone-bottom-tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === activeTab;

        return (
          <Pressable key={tab.key} onPress={() => onNavigate(tab.route)} style={styles.tabItem}>
            <Icon width={20} height={20} color={isActive ? theme.colors.accentAction : theme.colors.textSecondary} />
            <BodyText style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>{tab.label}</BodyText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgPanel,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.s2,
    paddingTop: theme.spacing.s2,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.s1,
    justifyContent: 'center',
    minHeight: 44,
  },
  tabLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizeXs,
    marginBottom: 0,
  },
  tabLabelActive: {
    color: theme.colors.accentAction,
  },
});
