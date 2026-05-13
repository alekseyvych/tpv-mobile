import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { theme } from '@/components/theme/theme';
import { LoginScreen } from '@/screens/auth/LoginScreen';

const mockLoginWithEmailPassword = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    loginWithEmailPassword: mockLoginWithEmailPassword,
  }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockLoginWithEmailPassword.mockReset();
  });

  it('renders title text', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <LoginScreen onGoHome={() => undefined} onGoPinLogin={() => undefined} />
      </I18nextProvider>
    );

    expect(view.getAllByText(/Sign in|Acceder/).length).toBeGreaterThan(0);
  });

  it('applies top safe-area inset in the header', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <LoginScreen onGoHome={() => undefined} onGoPinLogin={() => undefined} />
      </I18nextProvider>
    );

    const topbar = view.getByTestId('topbar-container');
    const style = StyleSheet.flatten(topbar.props.style);

    expect(style.paddingTop).toBe(theme.spacing.s3 + 24);
  });

  it('shows validation error for invalid email and skips auth call', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <LoginScreen onGoHome={() => undefined} onGoPinLogin={() => undefined} />
      </I18nextProvider>
    );

    fireEvent.changeText(view.getByPlaceholderText(/Email|Correo/), 'invalid-email');
    fireEvent.changeText(view.getByPlaceholderText(/Password|Contraseña/), 'abc12345');
    const signInButtons = view.getAllByText(/Sign in|Iniciar sesión/);
    fireEvent.press(signInButtons[signInButtons.length - 1]);

    await waitFor(() => {
      expect(view.getByText(/Enter a valid email address|Ingresa un correo válido/)).toBeTruthy();
    });
    expect(mockLoginWithEmailPassword).not.toHaveBeenCalled();
  });
});
