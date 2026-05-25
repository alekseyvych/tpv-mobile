import { render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { getRolePermissions } from '@/api/roles.api';
import i18n from '@/i18n/config';
import { MyPermissionsScreen } from '@/screens/settings/MyPermissionsScreen';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/api/roles.api', () => ({
  getRolePermissions: jest.fn(),
}));

describe('MyPermissionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRolePermissions as jest.Mock).mockResolvedValue([]);
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'admin@test-store.com',
        tenantId: 'tenant-1',
        firstName: 'Admin',
        lastName: 'User',
        roles: ['SUPER_ADMIN', 'MANAGER'],
        permissions: ['terminals:read', 'sales:create', 'payments:read'],
      },
      roles: ['SUPER_ADMIN', 'MANAGER'],
      permissions: ['terminals:read', 'sales:create', 'payments:read'],
    });
  });

  it('renders current user summary and grouped permissions', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <MyPermissionsScreen embedded />
      </I18nextProvider>,
    );

    expect(view.getByText(/Admin User/)).toBeTruthy();
    expect(view.getByText(/admin@test-store.com/)).toBeTruthy();
    expect(view.getByText(/SUPER_ADMIN/)).toBeTruthy();
    expect(view.getAllByText(/3 permissions|3 permisos/).length).toBeGreaterThan(0);
    expect(view.getAllByText(/3 modules|3 módulos/).length).toBeGreaterThan(0);
    expect(view.getAllByText(/Sales|ventas/).length).toBeGreaterThan(0);
    expect(view.getAllByText(/Terminals|terminales/).length).toBeGreaterThan(0);
    expect(view.getAllByText(/Create|Crear/).length).toBeGreaterThan(0);
    expect(view.getAllByText(/View|Ver/).length).toBeGreaterThan(0);
    expect(view.queryByText(/Permission code|Código de permiso/)).toBeNull();
    expect(view.queryByText(/sales:create/)).toBeNull();
  });

  it('shows an empty state when the user has no permissions', async () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'waiter@test-store.com',
        tenantId: 'tenant-1',
        firstName: 'Waiter',
        lastName: 'User',
        roles: ['WAITER'],
        permissions: [],
      },
      roles: ['WAITER'],
      permissions: [],
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <MyPermissionsScreen embedded />
      </I18nextProvider>,
    );

    expect(view.getByText(/Waiter User/)).toBeTruthy();

    await waitFor(() => {
      expect(view.getByText(/No permissions are assigned to this account|No hay permisos asignados a esta cuenta/)).toBeTruthy();
    });
  });

  it('hydrates permissions from role endpoints when payload permissions are empty', async () => {
    (getRolePermissions as jest.Mock)
      .mockResolvedValueOnce(['users:read', 'roles:update'])
      .mockResolvedValueOnce(['users:read', 'reports:read']);

    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'superadmin@test-store.com',
        tenantId: 'tenant-1',
        firstName: 'Super',
        lastName: 'Admin',
        roles: ['SUPER_ADMIN', 'MANAGER'],
        permissions: [],
      },
      roles: ['SUPER_ADMIN', 'MANAGER'],
      permissions: [],
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <MyPermissionsScreen embedded />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByText(/Users|usuarios/)).toBeTruthy();
      expect(view.getAllByText(/Roles|roles/).length).toBeGreaterThan(0);
      expect(view.getByText(/Reports|reportes/)).toBeTruthy();
    });

    await waitFor(() => {
      expect(view.getAllByText(/3 permissions|3 permisos/).length).toBeGreaterThan(0);
      expect(view.getAllByText(/3 modules|3 módulos/).length).toBeGreaterThan(0);
    });
    expect(getRolePermissions).toHaveBeenCalledTimes(2);
  });
});