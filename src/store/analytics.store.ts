import { create } from 'zustand';

import type { AnalyticsContext, AnalyticsEvent } from '@/types/analytics';

type AnalyticsState = {
  queue: AnalyticsEvent[];
  context: AnalyticsContext;
  setQueue: (events: AnalyticsEvent[]) => void;
  setContext: (context: AnalyticsContext) => void;
  mergeContext: (context: Partial<AnalyticsContext>) => void;
  clearContext: () => void;
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  queue: [],
  context: {},
  setQueue(queue) {
    set({ queue });
  },
  setContext(context) {
    set({ context });
  },
  mergeContext(context) {
    set((state) => ({ context: { ...state.context, ...context } }));
  },
  clearContext() {
    set({ context: {} });
  },
}));
