import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppShellRouter } from '@/layouts/AppShellRouter';

const mockUseDeviceProfile = jest.fn();

jest.mock('@/platform/useDeviceProfile', () => ({
  useDeviceProfile: () => mockUseDeviceProfile(),
}));

jest.mock('@/layouts/PhoneAppShell', () => ({
  PhoneAppShell: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'router-phone-shell' }, children);
  },
}));

jest.mock('@/layouts/TabletAppShell', () => ({
  TabletAppShell: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'router-tablet-shell' }, children);
  },
}));

jest.mock('@/layouts/KitchenDisplayShell', () => ({
  KitchenDisplayShell: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'router-kitchen-shell' }, children);
  },
}));

describe('AppShellRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeviceProfile.mockReturnValue({ isPhone: true });
  });

  it('renders kitchen shell when kitchen mode is enabled', () => {
    const view = render(
      <AppShellRouter
        currentRoute="KitchenDisplay"
        onNavigate={jest.fn()}
        isRouteEnabled={() => true}
        user={null}
        onOpenUserMenu={jest.fn()}
        isKitchenMode
      >
        <Text testID="router-child">content</Text>
      </AppShellRouter>,
    );

    expect(view.getByTestId('router-kitchen-shell')).toBeTruthy();
    expect(view.queryByTestId('router-phone-shell')).toBeNull();
    expect(view.queryByTestId('router-tablet-shell')).toBeNull();
  });

  it('renders phone shell when device profile is phone and not kitchen mode', () => {
    const view = render(
      <AppShellRouter
        currentRoute="Home"
        onNavigate={jest.fn()}
        isRouteEnabled={() => true}
        user={null}
        onOpenUserMenu={jest.fn()}
      >
        <Text testID="router-child">content</Text>
      </AppShellRouter>,
    );

    expect(view.getByTestId('router-phone-shell')).toBeTruthy();
    expect(view.queryByTestId('router-tablet-shell')).toBeNull();
  });

  it('renders tablet shell when device profile is tablet and not kitchen mode', () => {
    mockUseDeviceProfile.mockReturnValue({ isPhone: false });

    const view = render(
      <AppShellRouter
        currentRoute="Home"
        onNavigate={jest.fn()}
        isRouteEnabled={() => true}
        user={null}
        onOpenUserMenu={jest.fn()}
      >
        <Text testID="router-child">content</Text>
      </AppShellRouter>,
    );

    expect(view.getByTestId('router-tablet-shell')).toBeTruthy();
    expect(view.queryByTestId('router-phone-shell')).toBeNull();
  });
});
