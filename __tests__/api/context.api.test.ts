import { apiClient } from '@/api/client';
import {
  clearLocalInstallationContextRemote,
  getLocalInstallationContext,
  upsertLocalInstallationContext,
} from '@/api/context.api';

describe('context api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gets local installation context', async () => {
    const context = { tenantId: 'tenant-1', installationId: 'dev-1' };
    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: context } as never);

    const result = await getLocalInstallationContext();

    expect(result).toEqual(context);
  });

  it('upserts local installation context', async () => {
    const context = { id: 'inst-2', tenantId: 'tenant-1', deviceId: 'dev-1', deviceType: 'POS' };
    const spy = jest.spyOn(apiClient, 'put').mockResolvedValue({ data: context } as never);

    const result = await upsertLocalInstallationContext({ deviceName: 'Register 1' });

    expect(spy).toHaveBeenCalledWith('/local-installation-context', { deviceName: 'Register 1' });
    expect(result.id).toBe('inst-2');
  });

  it('clears remote context', async () => {
    const spy = jest.spyOn(apiClient, 'delete').mockResolvedValue({} as never);

    await clearLocalInstallationContextRemote();

    expect(spy).toHaveBeenCalledWith('/local-installation-context');
  });
});
