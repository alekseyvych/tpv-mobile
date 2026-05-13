import { setLanguagePreference } from '@/utils/storage';

describe('storage', () => {
  it('sets language preference', async () => {
    await expect(setLanguagePreference('en')).resolves.toBeUndefined();
  });
});
