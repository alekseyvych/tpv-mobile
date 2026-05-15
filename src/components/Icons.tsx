import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface IconProps {
  width: number;
  height: number;
  color: string;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface BaseIconProps extends IconProps {
  name: IconName;
}

export function Icon({ width, height, color, name }: BaseIconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={Math.max(width, height)}
      color={color}
    />
  );
}

export const ShoppingCartIcon = (props: IconProps) => <Icon {...props} name="cart-outline" />;
export const CubeIcon = (props: IconProps) => <Icon {...props} name="package-variant-closed" />;
export const UserIcon = (props: IconProps) => <Icon {...props} name="account-outline" />;
export const BanknotesIcon = (props: IconProps) => <Icon {...props} name="cash-multiple" />;
export const TicketIcon = (props: IconProps) => <Icon {...props} name="ticket-confirmation-outline" />;
export const ChartBarIcon = (props: IconProps) => <Icon {...props} name="chart-bar" />;
export const ReceiptPercentIcon = (props: IconProps) => <Icon {...props} name="receipt-text-check-outline" />;
export const Squares2X2Icon = (props: IconProps) => <Icon {...props} name="view-grid-outline" />;
export const BuildingStorefrontIcon = (props: IconProps) => <Icon {...props} name="store-outline" />;
export const UtensilsIcon = (props: IconProps) => <Icon {...props} name="silverware-fork-knife" />;
export const ChefHatIcon = (props: IconProps) => <Icon {...props} name="chef-hat" />;
export const CalendarIcon = (props: IconProps) => <Icon {...props} name="calendar-month-outline" />;
export const WrenchIcon = (props: IconProps) => <Icon {...props} name="wrench-outline" />;
export const CurrencyEuroIcon = (props: IconProps) => <Icon {...props} name="currency-eur" />;
export const DocumentCheckIcon = (props: IconProps) => <Icon {...props} name="file-document-check-outline" />;
export const CheckCircleIcon = (props: IconProps) => <Icon {...props} name="check-circle-outline" />;
export const ShieldCheckIcon = (props: IconProps) => <Icon {...props} name="shield-check-outline" />;
export const LockClosedIcon = (props: IconProps) => <Icon {...props} name="lock-outline" />;
export const UserGroupIcon = (props: IconProps) => <Icon {...props} name="account-group-outline" />;
export const Bars3Icon = (props: IconProps) => <Icon {...props} name="menu" />;
export const EllipsisVerticalIcon = (props: IconProps) => <Icon {...props} name="dots-vertical" />;
