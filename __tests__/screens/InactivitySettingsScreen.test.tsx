import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { InactivitySettingsScreen } from '@/screens/settings/InactivitySettingsScreen';

const mockStore = {
  config: {
    defaultProfile: {
      shortInactivityMinutes: 1,
      longInactivityMinutes: 5,
      quickReentryMethod: 'PIN_ONLY' as const,
    },
  },
  load: jest.fn(async () => undefined),
  save: jest.fn(async () => undefined),
};

jest.mock('@/store/session-policy.store', () => ({
  useSessionPolicyStore: () => mockStore,
}));

describe('InactivitySettingsScreen', () => {
  beforeEach(() => {
    mockStore.load.mockClear();
    mockStore.save.mockClear();
  });

  it('saves an updated inactivity policy', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <InactivitySettingsScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.changeText(view.getByDisplayValue('5'), '6');
    fireEvent.press(view.getByText(/Save policy|Guardar politica/));

    await waitFor(() => {
      expect(mockStore.save).toHaveBeenCalledWith({
        defaultProfile: {
          shortInactivityMinutes: 1,
          longInactivityMinutes: 6,
          quickReentryMethod: 'PIN_ONLY',
        },
      });
    });
  });
});
