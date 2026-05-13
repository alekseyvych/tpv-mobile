import { apiClient } from '@/api/client';
import { changePassword, logoutAllDevices } from '@/api/auth.api';

describe('auth api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to legacy logout-all endpoint when needed', async () => {
    const postSpy = jest
      .spyOn(apiClient, 'post')
      .mockRejectedValueOnce(new Error('missing route'))
      .mockResolvedValueOnce({ data: {} } as never);

    await logoutAllDevices();

    expect(postSpy).toHaveBeenNthCalledWith(1, '/auth/logout-all');
    expect(postSpy).toHaveBeenNthCalledWith(2, '/auth/logout-all-devices');
  });

  it('posts authenticated password changes to the real endpoint', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: {} } as never);

    await changePassword({ oldPassword: 'OldPass123', newPassword: 'NewPass123' });

    expect(postSpy).toHaveBeenCalledWith('/auth/change-password', {
      oldPassword: 'OldPass123',
      newPassword: 'NewPass123',
    });
  });
});
