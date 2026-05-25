const ROLE_PRIORITY = ['WAITER', 'CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;

type KnownRole = (typeof ROLE_PRIORITY)[number];

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeRoles(roles: string[]): string[] {
  return roles.map(normalize);
}

export function normalizePermissions(permissions: string[]): string[] {
  return permissions.map(normalize);
}

export function hasRoleAtLeast(roles: string[], minimumRole: KnownRole): boolean {
  const minIndex = ROLE_PRIORITY.indexOf(minimumRole);
  if (minIndex < 0) return true;

  return normalizeRoles(roles).some((role) => {
    const roleIndex = ROLE_PRIORITY.indexOf(role as KnownRole);
    return roleIndex >= minIndex;
  });
}

export function hasRequiredRole(roles: string[], requiredRoles: string[]): boolean {
  if (requiredRoles.length === 0) {
    return true;
  }

  const normalizedRoles = normalizeRoles(roles);
  return requiredRoles.some((requiredRole) => {
    const normalizedRequiredRole = normalize(requiredRole);
    const requiredIndex = ROLE_PRIORITY.indexOf(normalizedRequiredRole as KnownRole);
    if (requiredIndex === -1) {
      return normalizedRoles.includes(normalizedRequiredRole);
    }

    return normalizedRoles.some((role) => {
      const roleIndex = ROLE_PRIORITY.indexOf(role as KnownRole);
      return roleIndex >= requiredIndex;
    });
  });
}

export function hasPermission(permissions: string[], permissionName: string): boolean {
  const normalizedPermissions = new Set(normalizePermissions(permissions));
  return normalizedPermissions.has(normalize(permissionName));
}

export function hasAnyPermissionMatching(permissions: string[], keywords: string[]): boolean {
  const normalizedPermissions = normalizePermissions(permissions);
  const normalizedKeywords = keywords.map(normalize);
  return normalizedPermissions.some((permission) =>
    normalizedKeywords.some((keyword) => permission.includes(keyword)),
  );
}

export function hasRequiredPermissions(
  permissions: string[],
  requiredPermissions: string[],
  requireAllPermissions: boolean,
): boolean {
  if (requiredPermissions.length === 0) {
    return true;
  }

  const normalizedPermissions = new Set(normalizePermissions(permissions));
  const normalizedRequiredPermissions = requiredPermissions.map(normalize);

  if (requireAllPermissions) {
    return normalizedRequiredPermissions.every((permission) => normalizedPermissions.has(permission));
  }

  return normalizedRequiredPermissions.some((permission) => normalizedPermissions.has(permission));
}

export function canAccessAuthRoute(routeName: string, roles: string[], permissions: string[]): boolean {
  if (routeName === 'Checkout' || routeName === 'Cart' || routeName === 'Payment' || routeName === 'Receipt') {
    return hasRoleAtLeast(roles, 'CASHIER') || hasAnyPermissionMatching(permissions, ['SALE', 'PAYMENT']);
  }

  if (routeName === 'DiningFloor' || routeName === 'TableDetail' || routeName === 'OrderCreation') {
    return hasRoleAtLeast(roles, 'WAITER') || hasAnyPermissionMatching(permissions, ['DINING', 'RESTAURANT', 'TABLE', 'ORDER']);
  }

  if (routeName === 'KitchenDisplay') {
    return hasRoleAtLeast(roles, 'MANAGER') || hasAnyPermissionMatching(permissions, ['KITCHEN', 'BAR']);
  }

  if (routeName === 'AppointmentsList' || routeName === 'BookAppointment' || routeName === 'AppointmentDetail') {
    return hasRoleAtLeast(roles, 'MANAGER') || hasAnyPermissionMatching(permissions, ['APPOINTMENT']);
  }

  if (routeName === 'SettingsDeviceInfo') {
    return hasRoleAtLeast(roles, 'MANAGER');
  }

  if (routeName === 'TerminalSelection') {
    if (permissions.length === 0) {
      return true;
    }
    return hasPermission(permissions, 'TERMINALS_READ') || hasAnyPermissionMatching(permissions, ['TERMINAL']);
  }

  return true;
}
