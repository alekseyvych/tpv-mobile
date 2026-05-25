import { apiClient } from './client';

type RolePermissionDto = {
  name: string;
  displayName?: string | null;
  description?: string | null;
  granted?: boolean;
};

type RolePermissionsResponse = {
  role: string;
  permissions?: RolePermissionDto[];
};

function normalizeRoleName(roleName: string): string {
  return roleName.trim().toUpperCase().replace(/-/g, '_');
}

export async function getRolePermissions(roleName: string): Promise<string[]> {
  const normalizedRoleName = normalizeRoleName(roleName);
  const { data } = await apiClient.get<RolePermissionsResponse>(
    `/roles/${encodeURIComponent(normalizedRoleName)}/permissions`,
  );

  return (data.permissions ?? [])
    .map((permission) => permission.name)
    .filter((permission): permission is string => typeof permission === 'string' && permission.trim().length > 0);
}
