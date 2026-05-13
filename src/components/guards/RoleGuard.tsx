import { ReactNode } from 'react';

import { useAuthStore } from '@/store/auth.store';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;
};

const ROLE_PRIORITY = ['WAITER', 'CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;

function hasRequiredRole(userRoles: string[], requiredRoles: string[]): boolean {
  if (requiredRoles.length === 0) {
    return true;
  }

  const normalizedUserRoles = userRoles.map((role) => role.toUpperCase());

  return requiredRoles.some((requiredRole) => {
    const requiredIndex = ROLE_PRIORITY.indexOf(requiredRole.toUpperCase() as (typeof ROLE_PRIORITY)[number]);
    if (requiredIndex === -1) {
      return normalizedUserRoles.includes(requiredRole.toUpperCase());
    }

    return normalizedUserRoles.some((role) => {
      const roleIndex = ROLE_PRIORITY.indexOf(role as (typeof ROLE_PRIORITY)[number]);
      return roleIndex >= requiredIndex;
    });
  });
}

function hasRequiredPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
  requireAllPermissions: boolean,
): boolean {
  if (requiredPermissions.length === 0) {
    return true;
  }

  const current = new Set(userPermissions);
  if (requireAllPermissions) {
    return requiredPermissions.every((permission) => current.has(permission));
  }

  return requiredPermissions.some((permission) => current.has(permission));
}

export function RoleGuard({
  children,
  fallback = null,
  requiredRoles = [],
  requiredPermissions = [],
  requireAllPermissions = true,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);

  if (!user) {
    return <>{fallback}</>;
  }

  const roleAllowed = hasRequiredRole(roles, requiredRoles);
  const permissionAllowed = hasRequiredPermissions(
    permissions,
    requiredPermissions,
    requireAllPermissions,
  );

  if (!roleAllowed || !permissionAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
