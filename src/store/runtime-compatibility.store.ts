import { create } from 'zustand';

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
  setChecking: () => void;
  setResult: (input: {
    status: CompatibilityStatus;
    code: string;
    message: string;
    updateRequired: boolean;
    updateRecommended: boolean;
    checkedAt: string;
  }) => void;
  setUnknown: (input: { code: string; message: string }) => void;
};

export const useRuntimeCompatibilityStore = create<RuntimeCompatibilityState>((set) => ({
  status: 'idle',
  code: null,
  message: null,
  updateRequired: false,
  updateRecommended: false,
  lastCheckedAt: null,
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
}));
