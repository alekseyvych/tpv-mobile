import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { RuntimeCompatibilityResponse } from '@/types/api';

type CompatibilityStatus =
  | 'idle'
  | 'checking'
  | 'compatible'
  | 'recommended'
  | 'required'
  | 'unknown';

type RuntimeCompatibilityState = {
  status: CompatibilityStatus;
  code: string | null;
  message: string | null;
  updateRequired: boolean;
  updateRecommended: boolean;
  lastCheckedAt: string | null;
  latestRelease: RuntimeCompatibilityResponse['latestRelease'];
  autoCheckEnabled: boolean;
  checkIntervalMinutes: number;
  setChecking: () => void;
  setResult: (input: {
    status: CompatibilityStatus;
    code: string;
    message: string;
    updateRequired: boolean;
    updateRecommended: boolean;
    checkedAt: string;
    latestRelease?: RuntimeCompatibilityResponse['latestRelease'];
  }) => void;
  setUnknown: (input: { code: string; message: string }) => void;
  setUpdatePreferences: (input: {
    autoCheckEnabled?: boolean;
    checkIntervalMinutes?: number;
  }) => void;
};

export const useRuntimeCompatibilityStore = create<RuntimeCompatibilityState>()(
  persist(
    (set) => ({
      status: 'idle',
      code: null,
      message: null,
      updateRequired: false,
      updateRecommended: false,
      lastCheckedAt: null,
      latestRelease: null,
      autoCheckEnabled: true,
      checkIntervalMinutes: 60,
      setChecking() {
        set({ status: 'checking' });
      },
      setResult(input) {
        set({
          status: input.status,
          code: input.code,
          message: input.message,
          updateRequired: input.updateRequired,
          updateRecommended: input.updateRecommended,
          lastCheckedAt: input.checkedAt,
          latestRelease: input.latestRelease ?? null,
        });
      },
      setUnknown(input) {
        set({
          status: 'unknown',
          code: input.code,
          message: input.message,
          updateRequired: false,
          updateRecommended: false,
          lastCheckedAt: new Date().toISOString(),
        });
      },
      setUpdatePreferences(input) {
        set((state) => ({
          autoCheckEnabled:
            typeof input.autoCheckEnabled === 'boolean'
              ? input.autoCheckEnabled
              : state.autoCheckEnabled,
          checkIntervalMinutes:
            typeof input.checkIntervalMinutes === 'number'
              ? Math.max(5, Math.round(input.checkIntervalMinutes))
              : state.checkIntervalMinutes,
        }));
      },
    }),
    {
      name: 'runtime-compatibility-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        autoCheckEnabled: state.autoCheckEnabled,
        checkIntervalMinutes: state.checkIntervalMinutes,
      }),
    }
  )
);
