import { create } from 'zustand';

import type { LocalInstallationContext } from '@/types/store';

type ContextState = {
  localContext: LocalInstallationContext | null;
  setupRequired: boolean;
  isCheckingContext: boolean;
  setLocalContext: (ctx: LocalInstallationContext | null) => void;
  setCheckingContext: (isChecking: boolean) => void;
};

export const useContextStore = create<ContextState>((set) => ({
  localContext: null,
  setupRequired: true,
  isCheckingContext: true,
  setLocalContext(ctx) {
    set({ localContext: ctx, setupRequired: !ctx });
  },
  setCheckingContext(isChecking) {
    set({ isCheckingContext: isChecking });
  },
}));
