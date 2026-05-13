import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { LogoutConfirmationScreen } from '@/screens/settings/LogoutConfirmationScreen';

const mockSettings = {
  logoutThisDevice: jest.fn(async () => undefined),
  logoutEveryDevice: jest.fn(async () => undefined),
  factoryReset: jest.fn(async () => undefined),
};

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettings,
}));

describe('LogoutConfirmationScreen', () => {
  beforeEach(() => {
    mockSettings.logoutThisDevice.mockClear();
    mockSettings.logoutEveryDevice.mockClear();
    mockSettings.factoryReset.mockClear();
  });

  it('runs device logout and completes the flow', async () => {
    const onDone = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <LogoutConfirmationScreen onBack={() => undefined} onDone={onDone} />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/Logout this device|Cerrar sesion en este dispositivo/));

    await waitFor(() => {
      expect(mockSettings.logoutThisDevice).toHaveBeenCalled();
      expect(onDone).toHaveBeenCalled();
    });
  });
});
