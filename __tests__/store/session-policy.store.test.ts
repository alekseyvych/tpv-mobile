import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSessionPolicyStore } from '@/store/session-policy.store';

describe('session policy store', () => {
  beforeEach(() => {
    useSessionPolicyStore.setState({
      config: {
        defaultProfile: {
          shortInactivityMinutes: 1,
          longInactivityMinutes: 5,
          quickReentryMethod: 'PIN_ONLY',
        },
      },
      isLoaded: false,
    });
    jest.clearAllMocks();
  });

  it('loads persisted session policy config', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(
      JSON.stringify({
        defaultProfile: {
          shortInactivityMinutes: 2,
          longInactivityMinutes: 8,
          quickReentryMethod: 'PASSWORD_ONLY',
        },
      }),
    );

    await useSessionPolicyStore.getState().load();

    expect(useSessionPolicyStore.getState().isLoaded).toBe(true);
    expect(useSessionPolicyStore.getState().config.defaultProfile.longInactivityMinutes).toBe(8);
    expect(useSessionPolicyStore.getState().config.defaultProfile.quickReentryMethod).toBe('PASSWORD_ONLY');
  });

  it('saves session policy config to AsyncStorage', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue();
    const nextConfig = {
      defaultProfile: {
        shortInactivityMinutes: 3,
        longInactivityMinutes: 9,
        quickReentryMethod: 'PIN_OR_PASSWORD' as const,
      },
    };

    await useSessionPolicyStore.getState().save(nextConfig);

    expect(setItemSpy).toHaveBeenCalledWith('sessionPolicyConfig', JSON.stringify(nextConfig));
    expect(useSessionPolicyStore.getState().config).toEqual(nextConfig);
  });
});
