import { fireEvent, render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { LanguageScreen } from '@/screens/settings/LanguageScreen';

const mockSettings = {
  language: 'en',
  changeLanguage: jest.fn(),
};

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettings,
}));

describe('LanguageScreen', () => {
  beforeEach(() => {
    mockSettings.changeLanguage.mockReset();
  });

  it('switches to the selected persisted language', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <LanguageScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/Spanish|Español/));

    expect(mockSettings.changeLanguage).toHaveBeenCalledWith('es');
  });
});
