import {
  canKeepCurrentRouteAfterSwap,
  resolveAccountSwapFallbackRoute,
} from '@/navigation/accountSwapRoute';

describe('accountSwapRoute', () => {
  const alwaysEnabled = () => true;

  it('falls back dining detail routes to DiningFloor', () => {
    const result = resolveAccountSwapFallbackRoute({
      currentRouteName: 'TableDetail',
      roles: ['WAITER'],
      permissions: [],
      allowCheckoutFallback: true,
      isShellRouteEnabled: alwaysEnabled,
    });

    expect(result).toEqual({ name: 'DiningFloor' });
  });

  it('falls back POS routes to Checkout when safe and auth-allowed', () => {
    const result = resolveAccountSwapFallbackRoute({
      currentRouteName: 'Payment',
      roles: ['CASHIER'],
      permissions: [],
      allowCheckoutFallback: true,
      isShellRouteEnabled: alwaysEnabled,
    });

    expect(result).toEqual({ name: 'Checkout' });
  });

  it('falls back POS routes to TerminalSelection when checkout fallback is unsafe', () => {
    const result = resolveAccountSwapFallbackRoute({
      currentRouteName: 'Payment',
      roles: ['WAITER'],
      permissions: ['TERMINALS_READ'],
      allowCheckoutFallback: false,
      isShellRouteEnabled: alwaysEnabled,
    });

    expect(result).toEqual({ name: 'TerminalSelection', params: { target: 'Checkout' } });
  });

  it('falls back POS routes to TerminalSelection when checkout is not auth-allowed', () => {
    const result = resolveAccountSwapFallbackRoute({
      currentRouteName: 'Payment',
      roles: ['WAITER'],
      permissions: [],
      allowCheckoutFallback: true,
      isShellRouteEnabled: alwaysEnabled,
    });

    expect(result).toEqual({ name: 'TerminalSelection', params: { target: 'Checkout' } });
  });

  it('falls back kitchen routes to Home when role is below manager', () => {
    const result = resolveAccountSwapFallbackRoute({
      currentRouteName: 'KitchenDisplay',
      roles: ['WAITER'],
      permissions: [],
      allowCheckoutFallback: true,
      isShellRouteEnabled: alwaysEnabled,
    });

    expect(result).toEqual({ name: 'Home' });
  });

  it('falls back settings detail routes to Settings', () => {
    const result = resolveAccountSwapFallbackRoute({
      currentRouteName: 'SettingsLanguage',
      roles: ['WAITER'],
      permissions: [],
      allowCheckoutFallback: true,
      isShellRouteEnabled: alwaysEnabled,
    });

    expect(result).toEqual({ name: 'Settings' });
  });

  it('returns Home for unknown routes', () => {
    const result = resolveAccountSwapFallbackRoute({
      currentRouteName: 'UnknownScreen',
      roles: ['WAITER'],
      permissions: [],
      allowCheckoutFallback: true,
      isShellRouteEnabled: alwaysEnabled,
    });

    expect(result).toEqual({ name: 'Home' });
  });

  it('allows keeping current route when shell + auth allow it', () => {
    expect(
      canKeepCurrentRouteAfterSwap({
        currentRouteName: 'Home',
        roles: ['WAITER'],
        permissions: [],
        allowCheckoutFallback: true,
        isShellRouteEnabled: alwaysEnabled,
      }),
    ).toBe(true);
  });
});
