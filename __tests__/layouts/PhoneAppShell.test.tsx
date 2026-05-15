import { fireEvent, render } from '@testing-library/react-native';
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
    const onOpenUserMenu = jest.fn();
    const view = render(
      <PhoneAppShell
        currentRoute="Home"
        onNavigate={jest.fn()}
        user={{
          id: 'u-1',
          email: 'user@example.com',
          firstName: 'Alex',
          lastName: 'Doe',
          tenantId: 'tenant-1',
          roles: ['WAITER'],
        }}
        onOpenUserMenu={onOpenUserMenu}
      >
        <Text testID="content">content</Text>
      </PhoneAppShell>
    );

    expect(view.getByTestId('shell-user-header')).toBeTruthy();
    expect(view.getByTestId('shell-user-trigger')).toBeTruthy();
    expect(view.getByText('Alex Doe')).toBeTruthy();
    expect(view.getByTestId('phone-shell-content')).toBeTruthy();
    expect(view.getByTestId('content')).toBeTruthy();
    expect(view.getByTestId('phone-navigator')).toBeTruthy();
    expect(view.getByTestId('phone-shell-safe-bottom')).toBeTruthy();

    fireEvent.press(view.getByTestId('shell-user-trigger'));
    expect(onOpenUserMenu).toHaveBeenCalledTimes(1);
  });
});
