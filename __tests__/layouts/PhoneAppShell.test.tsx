import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PhoneAppShell } from '@/layouts/PhoneAppShell';

jest.mock('@/navigation/PhoneNavigator', () => ({
  PhoneNavigator: ({ currentRoute }: { currentRoute: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'phone-navigator' }, `phone-nav-${currentRoute}`);
  },
}));

describe('PhoneAppShell', () => {
  it('renders content area, navigator, and safe-area bottom spacer', () => {
    const view = render(
      <PhoneAppShell
        currentRoute="Home"
        onNavigate={jest.fn()}
        isRouteEnabled={() => true}
      >
        <Text testID="content">content</Text>
      </PhoneAppShell>
    );

    expect(view.getByTestId('phone-shell-content')).toBeTruthy();
    expect(view.getByTestId('content')).toBeTruthy();
    expect(view.getByTestId('phone-navigator')).toBeTruthy();
    expect(view.getByTestId('phone-shell-safe-bottom')).toBeTruthy();
  });
});
