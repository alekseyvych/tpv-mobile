import { apiClient } from '@/api/client';

describe('api client', () => {
  it('has configured base URL', () => {
    expect(apiClient.defaults.baseURL).toBeTruthy();
  });
});
