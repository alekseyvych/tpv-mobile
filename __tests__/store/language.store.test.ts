import i18n from '@/i18n/config';
import { useLanguageStore } from '@/store/language.store';
import * as storage from '@/utils/storage';

describe('language store', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'en' });
    jest.restoreAllMocks();
  });

  it('initializes from stored preference', async () => {
    jest.spyOn(storage, 'getLanguagePreference').mockResolvedValue('es');
    const changeLanguageSpy = jest.spyOn(i18n, 'changeLanguage').mockResolvedValue(i18n.t as never);

    await useLanguageStore.getState().initializeLanguage();

    expect(changeLanguageSpy).toHaveBeenCalledWith('es');
    expect(useLanguageStore.getState().language).toBe('es');
  });

  it('persists explicit language changes', async () => {
    const setPreferenceSpy = jest.spyOn(storage, 'setLanguagePreference').mockResolvedValue();
    const changeLanguageSpy = jest.spyOn(i18n, 'changeLanguage').mockResolvedValue(i18n.t as never);

    await useLanguageStore.getState().setLanguage('es');

    expect(changeLanguageSpy).toHaveBeenCalledWith('es');
    expect(setPreferenceSpy).toHaveBeenCalledWith('es');
    expect(useLanguageStore.getState().language).toBe('es');
  });
});
