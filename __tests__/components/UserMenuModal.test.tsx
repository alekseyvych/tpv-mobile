import { fireEvent, render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { UserMenuModal } from '@/components/header/UserMenuModal';

describe('UserMenuModal', () => {
  it('renders options, logout, and swap actions', () => {
    const onOpenOptions = jest.fn();
    const onLogout = jest.fn();
    const onSwap = jest.fn();

    const view = render(
      <I18nextProvider i18n={i18n}>
        <UserMenuModal
          visible
          userName="Alex Doe"
          swapBlocked={false}
          swapBlockedMessage="blocked"
          onClose={jest.fn()}
          onOpenOptions={onOpenOptions}
          onLogout={onLogout}
          onSwap={onSwap}
        />
      </I18nextProvider>
    );

    fireEvent.press(view.getByText(/Options|Opciones/));
    fireEvent.press(view.getByText(/Log out|Cerrar sesión/));
    fireEvent.press(view.getByText(/Swap account|Cambiar cuenta/));

    expect(onOpenOptions).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
    expect(onSwap).toHaveBeenCalled();
  });

  it('shows blocking message when swap is disabled', () => {
    const onSwap = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <UserMenuModal
          visible
          userName="Alex Doe"
          swapBlocked
          swapBlockedMessage="unsafe-state"
          onClose={jest.fn()}
          onOpenOptions={jest.fn()}
          onLogout={jest.fn()}
          onSwap={onSwap}
        />
      </I18nextProvider>
    );

    fireEvent.press(view.getByText(/Swap account|Cambiar cuenta/));
    expect(view.getByText('unsafe-state')).toBeTruthy();
    expect(onSwap).not.toHaveBeenCalled();
  });
});
