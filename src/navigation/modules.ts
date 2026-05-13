/**
 * Navigation Routes and Modules Configuration
 *
 * Defines all available modules and their navigation properties.
 * Used by both PhoneNavigator and TabletNavigator to render navigation items.
 *
 * Phone uses the first 5 modules in the "primary" group as bottom tabs.
 * Remaining modules go in "More" screen.
 *
 * Tablet uses all modules organized by section in a sidebar.
 */

import {
  ShoppingCartIcon,
  CubeIcon,
  Squares2X2Icon,
  UserIcon,
  BuildingStorefrontIcon,
  ChefHatIcon,
  CalendarIcon,
  WrenchIcon,
  CurrencyEuroIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
} from '@/components/Icons';

export interface NavModule {
  id: string;
  label: string;          // i18n key
  icon: any;              // React Native Icon component
  route: string;          // Navigation route name
  section: 'operational' | 'administrative' | 'settings';
  primary?: boolean;      // Show in phone bottom nav (first 5)
  locked?: boolean;       // License or permission locked
  lockedReason?: string;  // i18n key for lock reason
}

/**
 * Primary navigation modules (operational core)
 * Phone bottom nav shows first 5 of these
 */
const OPERATIONAL_MODULES: NavModule[] = [
  {
    id: 'home',
    label: 'layout.moduleLabels.home',
    icon: Squares2X2Icon,
    route: 'Home',
    section: 'operational',
    primary: true,
  },
  {
    id: 'sale',
    label: 'layout.moduleLabels.sale',
    icon: ShoppingCartIcon,
    route: 'Checkout',  // Existing Checkout screen
    section: 'operational',
    primary: true,
  },
  {
    id: 'catalog',
    label: 'layout.moduleLabels.catalog',
    icon: CubeIcon,
    route: 'CatalogMain',
    section: 'operational',
    primary: true,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'inventory',
    label: 'layout.moduleLabels.inventory',
    icon: Squares2X2Icon,
    route: 'InventoryMain',
    section: 'operational',
    primary: true,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'customers',
    label: 'layout.moduleLabels.customers',
    icon: UserIcon,
    route: 'CustomersMain',
    section: 'operational',
    primary: true,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'restaurant',
    label: 'layout.moduleLabels.restaurant',
    icon: BuildingStorefrontIcon,
    route: 'DiningFloor',  // Existing dining floor screen
    section: 'operational',
    primary: false,
  },
  {
    id: 'kitchen',
    label: 'layout.moduleLabels.kitchen',
    icon: ChefHatIcon,
    route: 'KitchenDisplay',  // Existing kitchen display
    section: 'operational',
    primary: false,
  },
  {
    id: 'appointments',
    label: 'layout.moduleLabels.appointments',
    icon: CalendarIcon,
    route: 'AppointmentsList',  // Existing appointments screen
    section: 'operational',
    primary: false,
  },
  {
    id: 'workshop',
    label: 'layout.moduleLabels.workshop',
    icon: WrenchIcon,
    route: 'WorkshopMain',
    section: 'operational',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
];

const ADMINISTRATIVE_MODULES: NavModule[] = [
  {
    id: 'fiscal',
    label: 'layout.moduleLabels.fiscal',
    icon: CurrencyEuroIcon,
    route: 'FiscalMain',
    section: 'administrative',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'sales-receipts',
    label: 'layout.moduleLabels.salesReceipts',
    icon: DocumentCheckIcon,
    route: 'SalesReceiptsMain',
    section: 'administrative',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'analytics',
    label: 'layout.moduleLabels.analytics',
    icon: ChartBarIcon,
    route: 'AnalyticsMain',
    section: 'administrative',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
];

const SETTINGS_MODULES: NavModule[] = [
  {
    id: 'settings',
    label: 'layout.moduleLabels.settings',
    icon: EllipsisVerticalIcon,
    route: 'Settings',  // Existing settings screen
    section: 'settings',
    primary: false,
  },
  {
    id: 'device-config',
    label: 'layout.moduleLabels.deviceConfig',
    icon: WrenchIcon,
    route: 'SettingsDeviceInfo',  // Existing device info
    section: 'settings',
    primary: false,
  },
  {
    id: 'audit',
    label: 'layout.moduleLabels.audit',
    icon: CheckCircleIcon,
    route: 'AuditMain',
    section: 'settings',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'users',
    label: 'layout.moduleLabels.users',
    icon: UserGroupIcon,
    route: 'UsersMain',
    section: 'settings',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'roles',
    label: 'layout.moduleLabels.roles',
    icon: ShieldCheckIcon,
    route: 'RolesMain',
    section: 'settings',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
  {
    id: 'licenses',
    label: 'layout.moduleLabels.licenses',
    icon: LockClosedIcon,
    route: 'LicensesMain',
    section: 'settings',
    primary: false,
    locked: true,
    lockedReason: 'layout.moduleLockedReasons.notAvailable',
  },
];

// All modules grouped by section
export const NAVIGATION_MODULES = {
  operational: OPERATIONAL_MODULES,
  administrative: ADMINISTRATIVE_MODULES,
  settings: SETTINGS_MODULES,
} as const;

// All modules in order
export const ALL_MODULES = [
  ...OPERATIONAL_MODULES,
  ...ADMINISTRATIVE_MODULES,
  ...SETTINGS_MODULES,
] as const;

/**
 * Get primary modules for phone bottom navigation
 * Returns first 5 modules marked as primary
 */
export function getPrimaryModules(): NavModule[] {
  return ALL_MODULES.filter((m) => m.primary).slice(0, 5);
}

/**
 * Get secondary/overflow modules for "More" screen on phone
 * Returns remaining modules not in primary nav
 */
export function getSecondaryModules(): NavModule[] {
  const primaryIds = new Set(getPrimaryModules().map((m) => m.id));
  return ALL_MODULES.filter((m) => !primaryIds.has(m.id));
}

/**
 * Get modules organized by section for tablet sidebar
 */
export function getModulesBySection(
  section: 'operational' | 'administrative' | 'settings'
): NavModule[] {
  return NAVIGATION_MODULES[section];
}

/**
 * Get all module sections for sidebar rendering
 */
export function getModuleSections() {
  return [
    { id: 'operational', label: 'layout.groupLabels.operational' },
    { id: 'administrative', label: 'layout.groupLabels.administrative' },
    { id: 'settings', label: 'layout.groupLabels.settings' },
  ] as const;
}
