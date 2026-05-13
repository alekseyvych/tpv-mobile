import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAutoLock } from '@/hooks/useAutoLock';
import { markActivity } from '@/hooks/auto-lock.activity';
import { useAuthStore } from '@/store/auth.store';
import { useSessionPolicyStore } from '@/store/session-policy.store';

function AutoLockProbe(props: {
  routeName: string;
  onShortLock: () => void;
  onLongInactivity: () => void;
}) {
  useAutoLock(props);
  return <Text>probe</Text>;
}

describe('useAutoLock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));

    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'u1',
        email: 'test@example.com',
        tenantId: 't1',
        roles: ['CASHIER'],
      },
      roles: ['CASHIER'],
      permissions: [],
    });

    useSessionPolicyStore.setState({
      isLoaded: true,
      config: {
        defaultProfile: {
          shortInactivityMinutes: 1,
          longInactivityMinutes: 5,
          quickReentryMethod: 'PIN_ONLY',
        },
      },
    });

    markActivity();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('triggers short lock after short inactivity threshold', () => {
    const onShortLock = jest.fn();
    const onLongInactivity = jest.fn();

    render(
      <AutoLockProbe
        routeName="Home"
        onShortLock={onShortLock}
        onLongInactivity={onLongInactivity}
      />
    );

    jest.setSystemTime(new Date('2026-05-12T10:01:20Z'));
    jest.advanceTimersByTime(10000);

    expect(onShortLock).toHaveBeenCalledTimes(1);
    expect(onLongInactivity).not.toHaveBeenCalled();
  });

  it('triggers long inactivity reauth after long threshold', () => {
    const onShortLock = jest.fn();
    const onLongInactivity = jest.fn();

    render(
      <AutoLockProbe
        routeName="Home"
        onShortLock={onShortLock}
        onLongInactivity={onLongInactivity}
      />
    );

    jest.setSystemTime(new Date('2026-05-12T10:05:30Z'));
    jest.advanceTimersByTime(10000);

    expect(onLongInactivity).toHaveBeenCalledTimes(1);
  });

  it('does not lock while auth flow route is active', () => {
    const onShortLock = jest.fn();
    const onLongInactivity = jest.fn();

    render(
      <AutoLockProbe
        routeName="Login"
        onShortLock={onShortLock}
        onLongInactivity={onLongInactivity}
      />
    );

    jest.setSystemTime(new Date('2026-05-12T10:06:00Z'));
    jest.advanceTimersByTime(20000);

    expect(onShortLock).not.toHaveBeenCalled();
    expect(onLongInactivity).not.toHaveBeenCalled();
  });
});
