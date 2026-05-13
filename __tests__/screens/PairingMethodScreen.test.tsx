import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { PairingMethodScreen } from '@/screens/pairing/PairingMethodScreen';

describe('PairingMethodScreen', () => {
  it('renders pairing options', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <PairingMethodScreen
          onChooseManual={() => undefined}
          onChooseQr={() => undefined}
          onBack={() => undefined}
        />
      </I18nextProvider>
    );

    expect(view.getAllByText(/Choose pairing method|Elegir método de vinculación/).length).toBeGreaterThan(0);
  });
});
