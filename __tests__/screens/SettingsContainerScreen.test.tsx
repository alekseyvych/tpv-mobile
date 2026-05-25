import { fireEvent, render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { SettingsContainerScreen } from '@/screens/settings/SettingsContainerScreen';

const mockUseDeviceProfile = jest.fn();

jest.mock('@/platform/useDeviceProfile', () => ({
  useDeviceProfile: () => mockUseDeviceProfile(),
}));

describe('SettingsContainerScreen', () => {
  beforeEach(() => {
    mockUseDeviceProfile.mockReturnValue({ isPhone: true });
  });

  it('renders a My permissions button and opens the permissions screen callback', () => {
    const onOpenPermissions = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <SettingsContainerScreen
          onBack={() => undefined}
          onOpenProfile={() => undefined}
          onOpenPermissions={onOpenPermissions}
          onOpenLanguage={() => undefined}
          onOpenDevice={() => undefined}
          onOpenInactivity={() => undefined}
          onOpenLogout={() => undefined}
        />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/My permissions|Mis permisos/));

    expect(onOpenPermissions).toHaveBeenCalledTimes(1);
  });
});