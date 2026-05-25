import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { ProfileScreen } from '@/screens/settings/ProfileScreen';
import { useAuthStore } from '@/store/auth.store';

const mockSettings = {
  user: {
    id: 'u1',
    email: 'ana@example.com',
    tenantId: 'tenant-1',
    roles: ['MANAGER'],
    firstName: 'Ana',
    lastName: 'Lopez',
  },
  changeOwnPassword: jest.fn(),
};

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettings,
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockSettings.changeOwnPassword.mockReset();
    // Ensure auth store has MANAGER role by default for tests
    useAuthStore.setState({ roles: ['MANAGER'], permissions: [] });
  });

  it('renders real profile fields', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ProfileScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    expect(view.getByText(/Ana Lopez/)).toBeTruthy();
    expect(view.getByText(/ana@example.com/)).toBeTruthy();
    expect(view.getByText(/tenant-1/)).toBeTruthy();
  });

  it('submits change password with validated input', async () => {
    mockSettings.changeOwnPassword.mockResolvedValue(undefined);
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ProfileScreen onBack={() => undefined} embedded />
      </I18nextProvider>,
    );

    fireEvent.changeText(view.getByPlaceholderText(/Current password|Contraseña actual/), 'OldPass123');
    fireEvent.changeText(view.getByPlaceholderText(/New password|Nueva contraseña/), 'NewPass123');
    const changePasswordButtons = view.getAllByText(/Change password|Cambiar contraseña/);
    fireEvent.press(changePasswordButtons[changePasswordButtons.length - 1]);

    await waitFor(() => {
      expect(mockSettings.changeOwnPassword).toHaveBeenCalledWith('OldPass123', 'NewPass123');
    });
    expect(view.getByText(/Password changed successfully|Contraseña cambiada correctamente/)).toBeTruthy();
  });

  it('does not surface raw backend password errors', async () => {
    mockSettings.changeOwnPassword.mockRejectedValue(new Error('backend-internal-secret'));
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ProfileScreen onBack={() => undefined} embedded />
      </I18nextProvider>,
    );

    fireEvent.changeText(view.getByPlaceholderText(/Current password|Contraseña actual/), 'OldPass123');
    fireEvent.changeText(view.getByPlaceholderText(/New password|Nueva contraseña/), 'NewPass123');
    fireEvent.press(view.getAllByText(/Change password|Cambiar contraseña/).slice(-1)[0]);

    await waitFor(() => {
      expect(view.getByText(/Could not change your password|No se pudo cambiar la contraseña/)).toBeTruthy();
    });
    expect(view.queryByText(/backend-internal-secret/)).toBeNull();
  });

  it('shows permission error when 403 is returned', async () => {
    const permissionError = { status: 403, message: 'Forbidden' };
    mockSettings.changeOwnPassword.mockRejectedValue(permissionError);
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ProfileScreen onBack={() => undefined} embedded />
      </I18nextProvider>,
    );

    fireEvent.changeText(view.getByPlaceholderText(/Current password|Contraseña actual/), 'OldPass123');
    fireEvent.changeText(view.getByPlaceholderText(/New password|Nueva contraseña/), 'NewPass123');
    fireEvent.press(view.getAllByText(/Change password|Cambiar contraseña/).slice(-1)[0]);

    await waitFor(() => {
      expect(view.getByText(/You do not have permission to change passwords|No tienes permiso para cambiar contraseñas/)).toBeTruthy();
    });
  });

  it('shows permission denied when embedded as waiter (not manager)', () => {
    // Set auth store to waiter role
    useAuthStore.setState({ roles: ['WAITER'], permissions: [] });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <ProfileScreen embedded />
      </I18nextProvider>,
    );

    // Should show permission error instead of password change form
    expect(view.getByText(/You do not have permission to change passwords|No tienes permiso para cambiar contraseñas/)).toBeTruthy();
  });

  it('allows password change when embedded as manager', () => {
    // Set auth store to manager role
    useAuthStore.setState({ roles: ['MANAGER'], permissions: [] });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <ProfileScreen embedded />
      </I18nextProvider>,
    );

    // Should show password fields
    expect(view.getByPlaceholderText(/Current password|Contraseña actual/)).toBeTruthy();
  });
});
