import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { ProfileScreen } from '@/screens/settings/ProfileScreen';

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
});
