export type SwapTargetRoute = {
  name: string;
  params?: Record<string, unknown>;
};

type Inputs = {
  currentRouteName: string;
  roles: string[];
  permissions: string[];
  allowCheckoutFallback: boolean;
  isShellRouteEnabled: (route: string) => boolean;
};

const ROLE_PRIORITY = ['WAITER', 'CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;

const DINING_DETAIL_ROUTES = new Set(['DiningFloor', 'TableDetail', 'OrderCreation', 'RestaurantCheckout']);
const POS_ROUTES = new Set(['Checkout', 'Cart', 'Payment', 'Receipt']);
const KITCHEN_ROUTES = new Set(['KitchenDisplay']);
const SETTINGS_DETAIL_ROUTES = new Set([
  'SettingsProfile',
  'SettingsDeviceInfo',
  'SettingsLanguage',
  'SettingsLogout',
  'SettingsInactivity',
]);

function hasRoleAtLeast(roles: string[], minimumRole: (typeof ROLE_PRIORITY)[number]): boolean {
  const minIndex = ROLE_PRIORITY.indexOf(minimumRole);
  if (minIndex < 0) return true;

  return roles
    .map((role) => role.toUpperCase())
    .some((role) => {
      const roleIndex = ROLE_PRIORITY.indexOf(role as (typeof ROLE_PRIORITY)[number]);
      return roleIndex >= minIndex;
    });
}

function hasPermission(permissions: string[], name: string): boolean {
  return permissions.map((permission) => permission.toUpperCase()).includes(name.toUpperCase());
}

function isRouteAllowedByAuth(routeName: string, roles: string[], permissions: string[]): boolean {
  if (KITCHEN_ROUTES.has(routeName)) {
    return hasRoleAtLeast(roles, 'MANAGER');
  }

  if (routeName === 'SettingsDeviceInfo') {
    return hasRoleAtLeast(roles, 'MANAGER');
  }

  if (routeName === 'TerminalSelection') {
    if (permissions.length === 0) return true;
    return hasPermission(permissions, 'TERMINALS_READ');
  }

  return true;
}

function shellRouteForStackRoute(routeName: string): string | null {
  if (routeName === 'Home') return 'Home';
  if (POS_ROUTES.has(routeName)) return 'Checkout';
  if (DINING_DETAIL_ROUTES.has(routeName)) return 'DiningFloor';
  if (KITCHEN_ROUTES.has(routeName)) return 'KitchenDisplay';
  if (routeName === 'More') return 'More';
  if (routeName === 'Settings' || SETTINGS_DETAIL_ROUTES.has(routeName)) return 'Settings';
  if (routeName === 'AppointmentsList' || routeName === 'BookAppointment' || routeName === 'AppointmentDetail') {
    return 'AppointmentsList';
  }
  return null;
}

function canAccessRoute(routeName: string, input: Inputs): boolean {
  if (!isRouteAllowedByAuth(routeName, input.roles, input.permissions)) {
    return false;
  }

  const shellRoute = shellRouteForStackRoute(routeName);
  if (!shellRoute) {
    return true;
  }

  return input.isShellRouteEnabled(shellRoute);
}

export function resolveAccountSwapFallbackRoute(input: Inputs): SwapTargetRoute {
  const { currentRouteName } = input;

  if (DINING_DETAIL_ROUTES.has(currentRouteName)) {
    if (canAccessRoute('DiningFloor', input)) {
      return { name: 'DiningFloor' };
    }
    return { name: 'Home' };
  }

  if (POS_ROUTES.has(currentRouteName)) {
    if (input.allowCheckoutFallback && canAccessRoute('Checkout', input)) {
      return { name: 'Checkout' };
    }
    if (canAccessRoute('TerminalSelection', input)) {
      return { name: 'TerminalSelection', params: { target: 'Checkout' } };
    }
    return { name: 'Home' };
  }

  if (KITCHEN_ROUTES.has(currentRouteName)) {
    if (canAccessRoute('KitchenDisplay', input)) {
      return { name: 'KitchenDisplay' };
    }
    return { name: 'Home' };
  }

  if (SETTINGS_DETAIL_ROUTES.has(currentRouteName)) {
    if (canAccessRoute('Settings', input)) {
      return { name: 'Settings' };
    }
    return { name: 'Home' };
  }

  return { name: 'Home' };
}

export function canKeepCurrentRouteAfterSwap(input: Inputs): boolean {
  return canAccessRoute(input.currentRouteName, input);
}
