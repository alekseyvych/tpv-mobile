import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type WaiterHomeContext = {
  lastTableId: string | null;
  lastOrderId: string | null;
  terminalId: string | null;
  updatedAt: string | null;
};

type WaiterHomeStore = {
  context: WaiterHomeContext;
  setResumeContext: (payload: { tableId: string; orderId?: string | null; terminalId?: string | null }) => void;
  clearResumeContext: () => void;
};

const EMPTY_CONTEXT: WaiterHomeContext = {
  lastTableId: null,
  lastOrderId: null,
  terminalId: null,
  updatedAt: null,
};

export const useWaiterHomeStore = create<WaiterHomeStore>()(
  persist(
    (set) => ({
      context: EMPTY_CONTEXT,
      setResumeContext(payload) {
        set({
          context: {
            lastTableId: payload.tableId,
            lastOrderId: payload.orderId ?? null,
            terminalId: payload.terminalId ?? null,
            updatedAt: new Date().toISOString(),
          },
        });
      },
      clearResumeContext() {
        set({ context: EMPTY_CONTEXT });
      },
    }),
    {
      name: 'waiter-home-context-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
