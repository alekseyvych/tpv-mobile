import { isShellRouteAccessible } from '@/navigation/shellRouteGuards';

describe('isShellRouteAccessible', () => {
  it('blocks kitchen route when auth policy denies access even if terminal allows it', () => {
    expect(
      isShellRouteAccessible('KitchenDisplay', true, 'POS', null, ['WAITER'], []),
    ).toBe(false);
  });

  it('allows appointments route when auth policy grants access and shell allows it', () => {
    expect(
      isShellRouteAccessible('AppointmentsList', true, 'POS', null, ['MANAGER'], []),
    ).toBe(true);
  });

  it('still blocks dining route when terminal mode disables it', () => {
    expect(
      isShellRouteAccessible('DiningFloor', true, 'POS', null, ['MANAGER'], ['RESTAURANT_ORDER_READ']),
    ).toBe(false);
  });
});import {
  isShellRouteEnabledForTerminal,
  resolveShellRoute,
  usesDiningFloorNavigation,
} from '@/navigation/shellRouteGuards';

describe('shellRouteGuards', () => {
  it('uses dining floor for RESTAURANT and personalized capability-enabled terminals', () => {
    expect(usesDiningFloorNavigation('RESTAURANT', null)).toBe(true);
    expect(
      usesDiningFloorNavigation('PERSONALIZED', {
        enableDiningFloorAndTables: true,
      }),
    ).toBe(true);
    expect(
      usesDiningFloorNavigation('PERSONALIZED', {
        enableDiningFloorAndTables: false,
      }),
    ).toBe(false);
    expect(usesDiningFloorNavigation('RETAIL', null)).toBe(false);
  });

  it('resolves only known shell routes and falls back to Home', () => {
    expect(resolveShellRoute('Checkout')).toBe('Checkout');
    expect(resolveShellRoute('Settings')).toBe('Settings');
    expect(resolveShellRoute('UnknownRoute')).toBe('Home');
  });

  it('disables unknown routes and terminal-required routes without selected terminal', () => {
    expect(isShellRouteEnabledForTerminal('UnknownRoute', true, 'RETAIL', null)).toBe(false);
    expect(isShellRouteEnabledForTerminal('Checkout', false, 'RETAIL', null)).toBe(false);
    expect(isShellRouteEnabledForTerminal('DiningFloor', false, 'RETAIL', null)).toBe(false);
  });

  it('enforces Checkout/DiningFloor route compatibility by terminal mode', () => {
    expect(isShellRouteEnabledForTerminal('Checkout', true, 'RETAIL', null)).toBe(true);
    expect(isShellRouteEnabledForTerminal('DiningFloor', true, 'RETAIL', null)).toBe(false);

    expect(isShellRouteEnabledForTerminal('Checkout', true, 'RESTAURANT', null)).toBe(false);
    expect(isShellRouteEnabledForTerminal('DiningFloor', true, 'RESTAURANT', null)).toBe(true);

    expect(
      isShellRouteEnabledForTerminal(
        'DiningFloor',
        true,
        'PERSONALIZED',
        { enableDiningFloorAndTables: true },
      ),
    ).toBe(true);
    expect(
      isShellRouteEnabledForTerminal(
        'Checkout',
        true,
        'PERSONALIZED',
        { enableDiningFloorAndTables: true },
      ),
    ).toBe(false);
  });
});
