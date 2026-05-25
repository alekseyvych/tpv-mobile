import { ReactNode } from 'react';

import { hasRequiredPermissions, hasRequiredRole } from '@/auth/access';
import { useAuthStore } from '@/store/auth.store';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;
};

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
