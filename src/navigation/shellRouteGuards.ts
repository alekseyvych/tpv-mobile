import { canAccessAuthRoute, hasRoleAtLeast } from '@/auth/access';

export const NAVIGABLE_SHELL_ROUTES = [
  'Home',
  'Checkout',
  'DiningFloor',
  'KitchenDisplay',
  'More',
  'AppointmentsList',
  'Settings',
  'SettingsDeviceInfo',
] as const;

export type ShellRouteName = (typeof NAVIGABLE_SHELL_ROUTES)[number];

export type TerminalCapabilityMap = Record<string, unknown> | null;

export function usesDiningFloorNavigation(
  operatingMode: string | null,
  capabilities: TerminalCapabilityMap,
): boolean {
  if (operatingMode === 'RESTAURANT') {
    return true;
  }

  if (operatingMode === 'PERSONALIZED') {
    return (
      (capabilities as { enableDiningFloorAndTables?: boolean } | null)
        ?.enableDiningFloorAndTables === true
    );
  }

  return false;
}

export function resolveShellRoute(route: string): ShellRouteName {
  return NAVIGABLE_SHELL_ROUTES.includes(route as ShellRouteName)
    ? (route as ShellRouteName)
    : 'Home';
}

export function isShellRouteEnabledForTerminal(
  route: string,
  hasSelectedTerminal: boolean,
  operatingMode: string | null,
  capabilities: TerminalCapabilityMap,
): boolean {
  if (!NAVIGABLE_SHELL_ROUTES.includes(route as ShellRouteName)) {
    return false;
  }

  if (!hasSelectedTerminal && (route === 'Checkout' || route === 'DiningFloor')) {
    return false;
  }

  const usesDining = usesDiningFloorNavigation(operatingMode, capabilities);
  if (route === 'Checkout' && usesDining) {
    return false;
  }

  if (route === 'DiningFloor' && !usesDining) {
    return false;
  }

  return true;
}

export function isShellRouteAccessible(
  route: string,
  hasSelectedTerminal: boolean,
  operatingMode: string | null,
  capabilities: TerminalCapabilityMap,
  roles: string[],
  permissions: string[],
): boolean {
  if (route === 'Checkout') {
    return canAccessAuthRoute(route, roles, permissions);
  }

  if (route === 'DiningFloor' && hasRoleAtLeast(roles, 'ADMIN')) {
    return canAccessAuthRoute(route, roles, permissions);
  }

  return (
    isShellRouteEnabledForTerminal(route, hasSelectedTerminal, operatingMode, capabilities) &&
    canAccessAuthRoute(route, roles, permissions)
  );
}
