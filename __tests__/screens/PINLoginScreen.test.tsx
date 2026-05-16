import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { PINLoginScreen } from '@/screens/auth/PINLoginScreen';

const mockLoadQuickAccessProfiles = jest.fn(async () => ({
  users: [{ id: 'u-1', displayName: 'Ana Lopez', initials: 'AL', role: 'Cashier' }],
  setupRequired: false,
}));
const mockLoginUsingQuickAccess = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    loadQuickAccessProfiles: mockLoadQuickAccessProfiles,
    loginUsingQuickAccess: mockLoginUsingQuickAccess,
  }),
}));

describe('PINLoginScreen', () => {
  beforeEach(() => {
    mockLoadQuickAccessProfiles.mockClear();
    mockLoginUsingQuickAccess.mockClear();
  });

  it('shows validation error for short pin in quick access PIN modal', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <PINLoginScreen onBack={() => undefined} onLoggedIn={() => undefined} />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(mockLoadQuickAccessProfiles).toHaveBeenCalled();
    });

    // Profile card with Select button should be visible
    await waitFor(() => {
      expect(view.getByText(/Ana Lopez/)).toBeTruthy();
    });

    // Open PIN modal
    fireEvent.press(view.getByText(/Select profile|Seleccionar perfil/));
    
    // Enter invalid PIN
    fireEvent.changeText(view.getByPlaceholderText(/4-digit PIN|PIN de 4 dígitos/), '123');
    fireEvent.press(view.getAllByText(/Login with quick access|Entrar con acceso rápido/)[0]);

    await waitFor(() => {
      expect(view.getByText(/PIN must be exactly 4 digits|El PIN debe tener exactamente 4 dígitos/)).toBeTruthy();
    });
    expect(mockLoginUsingQuickAccess).not.toHaveBeenCalled();
  });

  it('selects quick access user from modal and submits quick access login', async () => {
    const onLoggedIn = jest.fn();
    mockLoginUsingQuickAccess.mockResolvedValueOnce(undefined);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <PINLoginScreen onBack={() => undefined} onLoggedIn={onLoggedIn} />
      </I18nextProvider>
    );

    // Wait for profiles to load
    await waitFor(() => {
      expect(view.getAllByText(/Ana Lopez/).length).toBeGreaterThan(0);
    });

    // Open PIN modal by selecting profile
    fireEvent.press(view.getByText(/Select profile|Seleccionar perfil/));
    
    // Enter valid PIN
    fireEvent.changeText(view.getByPlaceholderText(/4-digit PIN|PIN de 4 dígitos/), '1234');
    
    // Submit quick access login
    fireEvent.press(view.getAllByText(/Login with quick access|Entrar con acceso rápido/)[0]);

    await waitFor(() => {
      expect(mockLoginUsingQuickAccess).toHaveBeenCalledWith('u-1', '1234');
      expect(onLoggedIn).toHaveBeenCalled();
    });
  });
});
