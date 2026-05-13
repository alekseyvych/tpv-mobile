import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type QuickReentryMethod = 'PIN_ONLY' | 'PIN_OR_PASSWORD' | 'PASSWORD_ONLY';

export type SessionPolicyProfile = {
  shortInactivityMinutes: number;
  longInactivityMinutes: number;
  quickReentryMethod: QuickReentryMethod;
};

export type SessionPolicyConfig = {
  defaultProfile: SessionPolicyProfile;
};

const STORAGE_KEY = 'sessionPolicyConfig';

const DEFAULT_CONFIG: SessionPolicyConfig = {
  defaultProfile: {
    shortInactivityMinutes: 1,    // 1 min = lock screen
    longInactivityMinutes: 5,     // 5 min = full reauth
    quickReentryMethod: 'PIN_ONLY',
  },
};

type SessionPolicyStore = {
  config: SessionPolicyConfig;
  isLoaded: boolean;
  load: () => Promise<void>;
  save: (config: SessionPolicyConfig) => Promise<void>;
};

export const useSessionPolicyStore = create<SessionPolicyStore>((set) => ({
  config: DEFAULT_CONFIG,
  isLoaded: false,

  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionPolicyConfig;
        set({ config: parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  async save(config) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    set({ config });
  },
}));
