import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TabletAppShell } from '@/layouts/TabletAppShell';

jest.mock('@/navigation/TabletNavigator', () => ({
  TabletNavigator: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'tablet-navigator' }, 'tablet-nav');
  },
}));

describe('TabletAppShell', () => {
  it('renders sidebar and content layout correctly', () => {
    const onOpenUserMenu = jest.fn();
    const view = render(
      <TabletAppShell
        currentRoute="Home"
        onNavigate={jest.fn()}
        isRouteEnabled={() => true}
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
        <Text testID="tablet-content-child">content</Text>
      </TabletAppShell>
    );

    expect(view.getByTestId('shell-user-header')).toBeTruthy();
    expect(view.getByTestId('shell-user-trigger')).toBeTruthy();
    expect(view.getByText('Alex Doe')).toBeTruthy();
    expect(view.getByTestId('tablet-shell-main')).toBeTruthy();
    expect(view.getByTestId('tablet-shell-sidebar')).toBeTruthy();
    expect(view.getByTestId('tablet-shell-content')).toBeTruthy();
    expect(view.getByTestId('tablet-content-child')).toBeTruthy();
    expect(view.getByTestId('tablet-navigator')).toBeTruthy();

    fireEvent.press(view.getByTestId('shell-user-trigger'));
    expect(onOpenUserMenu).toHaveBeenCalledTimes(1);
  });
});
