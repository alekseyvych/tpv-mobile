import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/auth.store';

describe('RoleGuard', () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState({
        user: null,
        roles: [],
        permissions: [],
        isAuthenticated: false,
      });
    });
  });

  it('renders fallback when there is no authenticated user', () => {
    const view = render(
      <RoleGuard fallback={<Text>No access</Text>} requiredRoles={['WAITER']}>
        <Text>Protected</Text>
      </RoleGuard>
    );

    expect(view.getByText('No access')).toBeTruthy();
  });

  it('allows role hierarchy access', () => {
    act(() => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'manager@example.com',
          tenantId: 't1',
          roles: ['MANAGER'],
        },
        roles: ['MANAGER'],
        permissions: [],
        isAuthenticated: true,
      });
    });

    const view = render(
      <RoleGuard fallback={<Text>No access</Text>} requiredRoles={['WAITER']}>
        <Text>Protected</Text>
      </RoleGuard>
    );

    expect(view.getByText('Protected')).toBeTruthy();
  });

  it('enforces required permissions', () => {
    act(() => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'cashier@example.com',
          tenantId: 't1',
          roles: ['CASHIER'],
          permissions: ['REPORTS_VIEW'],
        },
        roles: ['CASHIER'],
        permissions: ['REPORTS_VIEW'],
        isAuthenticated: true,
      });
    });

    const denied = render(
      <RoleGuard
        fallback={<Text>No access</Text>}
        requiredPermissions={['REPORTS_VIEW', 'AUDIT_READ']}
      >
        <Text>Protected</Text>
      </RoleGuard>
    );

    expect(denied.getByText('No access')).toBeTruthy();

    const allowed = render(
      <RoleGuard
        fallback={<Text>No access</Text>}
        requiredPermissions={['REPORTS_VIEW']}
      >
        <Text>Protected</Text>
      </RoleGuard>
    );

    expect(allowed.getByText('Protected')).toBeTruthy();
  });
});
