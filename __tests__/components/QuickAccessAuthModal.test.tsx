import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { QuickAccessAuthModal } from '@/components/auth/QuickAccessAuthModal';

const mockLoadQuickAccessProfiles = jest.fn(async () => ({
  users: [
    { id: 'u-1', displayName: 'Ana Lopez', initials: 'AL', role: 'Cashier' },
    { id: 'u-2', displayName: 'Ben Diaz', initials: 'BD', role: 'Manager' },
  ],
  setupRequired: false,
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    loadQuickAccessProfiles: mockLoadQuickAccessProfiles,
  }),
}));

jest.mock('@/platform/useDeviceProfile', () => ({
  useDeviceProfile: () => ({ isPhone: true }),
}));

describe('QuickAccessAuthModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits selected quick-access user and closes on valid PIN', async () => {
    const onClose = jest.fn();
    const onAuthenticated = jest.fn(async () => undefined);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <QuickAccessAuthModal
          visible
          onClose={onClose}
          onAuthenticated={onAuthenticated}
          title="Swap"
          description="Select"
          submitLabel="Swap account"
        />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(mockLoadQuickAccessProfiles).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(view.getByText(/Select profile|Seleccionar perfil/));
    fireEvent.changeText(view.getByPlaceholderText(/4-digit PIN|PIN de 4 dígitos/), '1234');
    fireEvent.press(view.getByText(/Swap account|Cambiar cuenta/));

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith('u-2', '1234');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps modal active and shows validation error on invalid PIN length', async () => {
    const onClose = jest.fn();
    const onAuthenticated = jest.fn(async () => undefined);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <QuickAccessAuthModal
          visible
          onClose={onClose}
          onAuthenticated={onAuthenticated}
          title="Swap"
          description="Select"
          submitLabel="Swap account"
        />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getAllByText('Ana Lopez').length).toBeGreaterThan(0);
    });

    fireEvent.changeText(view.getByPlaceholderText(/4-digit PIN|PIN de 4 dígitos/), '12');
    fireEvent.press(view.getByText(/Swap account|Cambiar cuenta/));

    await waitFor(() => {
      expect(view.getByText(/PIN must be exactly 4 digits|El PIN debe tener exactamente 4 dígitos/)).toBeTruthy();
    });

    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
