import { create } from 'zustand';

import type { PairingCompletionResponse } from '@/types/api';
import type { PairingStatus } from '@/types/store';

type PairingStore = {
  status: PairingStatus;
  error: string | null;
  lastResult: PairingCompletionResponse | null;
  setLoading: () => void;
  setSuccess: (result: PairingCompletionResponse) => void;
  setError: (error: string) => void;
  reset: () => void;
};

export const usePairingStore = create<PairingStore>((set) => ({
  status: 'idle',
  error: null,
  lastResult: null,
  setLoading() {
    set({ status: 'loading', error: null });
  },
  setSuccess(result) {
    set({ status: 'success', lastResult: result, error: null });
  },
  setError(error) {
    set({ status: 'error', error });
  },
  reset() {
    set({ status: 'idle', error: null });
  },
}));
