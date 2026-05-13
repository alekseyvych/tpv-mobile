import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppProviders } from '@/App';

describe('AppProviders', () => {
  it('wraps content with SafeAreaProvider', () => {
    const view = render(
      <AppProviders>
        <Text>child</Text>
      </AppProviders>
    );

    expect(view.getByTestId('safe-area-provider')).toBeTruthy();
    expect(view.getByText('child')).toBeTruthy();
  });
});
