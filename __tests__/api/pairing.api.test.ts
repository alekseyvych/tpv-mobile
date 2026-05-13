import { apiClient } from '@/api/client';
import { completePairing } from '@/api/pairing.api';

describe('pairing api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes pairing with manual code payload', async () => {
    const response = {
      deviceId: 'device-1',
      tenantId: 'tenant-1',
      installationId: 'install-1',
      deviceType: 'TABLET',
      configuredAt: new Date().toISOString(),
    };

    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: response } as never);

    const result = await completePairing({ manualCode: 'AB12-CD34' });

    expect(spy).toHaveBeenCalledWith('/device-pairing-sessions/complete', { manualCode: 'AB12-CD34' });
    expect(result.deviceId).toBe('device-1');
  });
});
