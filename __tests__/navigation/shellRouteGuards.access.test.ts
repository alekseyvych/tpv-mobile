import { isShellRouteAccessible } from '@/navigation/shellRouteGuards';

describe('shellRouteGuards access overrides', () => {
  it('allows cashier to enter Checkout even when no terminal is selected yet', () => {
    expect(
      isShellRouteAccessible('Checkout', false, 'RESTAURANT', null, ['CASHIER'], []),
    ).toBe(true);
  });

  it('blocks waiter from entering Checkout when they do not have POS access', () => {
    expect(
      isShellRouteAccessible('Checkout', false, 'RESTAURANT', null, ['WAITER'], []),
    ).toBe(false);
  });

  it('allows super admin to enter DiningFloor even when the terminal mode is retail', () => {
    expect(
      isShellRouteAccessible('DiningFloor', true, 'RETAIL', null, ['SUPER_ADMIN'], []),
    ).toBe(true);
  });
});
