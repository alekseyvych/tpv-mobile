import { create } from 'zustand';

import i18n from '@/i18n/config';
import { getLanguagePreference, setLanguagePreference } from '@/utils/storage';

type LanguageState = {
  language: string;
  initializeLanguage: () => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: i18n.language,
  async initializeLanguage() {
    const stored = await getLanguagePreference();
    if (stored) {
      await i18n.changeLanguage(stored);
      set({ language: stored });
    }
  },
  async setLanguage(language) {
    await i18n.changeLanguage(language);
    await setLanguagePreference(language);
    set({ language });
  }
}));
