import { create } from 'zustand';

import type { ThemeMode } from '@/types/ui';

type UiState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

export const useUiStore = create<UiState>((set) => ({
  themeMode: 'light',
  setThemeMode(mode) {
    set({ themeMode: mode });
  }
}));
