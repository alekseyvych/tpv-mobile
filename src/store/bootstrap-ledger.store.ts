import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type BootstrapLedgerState = {
  initialized: boolean;
  tenantId: string | null;
  bootstrapVersion: string | null;
  lastAppliedAt: string | null;
  markBootstrapApplied: (input: { tenantId?: string; bootstrapVersion?: string }) => void;
};

export const useBootstrapLedgerStore = create<BootstrapLedgerState>()(
  persist(
    (set) => ({
      initialized: false,
      tenantId: null,
      bootstrapVersion: null,
      lastAppliedAt: null,
      markBootstrapApplied(input) {
        set({
          initialized: true,
          tenantId: input.tenantId ?? null,
          bootstrapVersion: input.bootstrapVersion ?? null,
          lastAppliedAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'bootstrap-ledger-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);