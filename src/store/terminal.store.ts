/**
 * Terminal Store
 *
 * Phase 3: Stores selected POS terminal information
 *
 * Contains:
 * - selectedTerminalId: Currently selected terminal ID
 * - operatingMode: Terminal's operating mode (RETAIL or RESTAURANT)
 * - capabilities: Optional terminal capabilities
 *
 * Used to:
 * - Determine which modules are visible in navigation
 * - Store context for API calls
 * - Persist terminal selection across screens
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type OperatingMode = 'RETAIL' | 'RESTAURANT' | 'PERSONALIZED';

interface TerminalStore {
  selectedTerminalId: string | null;
  operatingMode: OperatingMode | null;
  capabilities: Record<string, unknown> | null;
  activeCashShiftId: string | null;
  activeCashShiftCheckedAt: number | null;
  terminalName: string | null;
  setSelectedTerminal: (
    terminalId: string,
    mode: OperatingMode,
    capabilities: Record<string, unknown> | null,
    terminalName?: string | null,
  ) => void;
  setActiveCashShiftId: (shiftId: string | null) => void;
  setActiveCashShiftCheckAt: (checkedAt: number | null) => void;
  setTerminalName: (name: string | null) => void;
  clearSelected: () => void;
}

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set) => ({
      selectedTerminalId: null,
      operatingMode: null,
      capabilities: null,
      activeCashShiftId: null,
      activeCashShiftCheckedAt: null,
      terminalName: null,
      setSelectedTerminal(terminalId, mode, capabilities, terminalName) {
        set({
          selectedTerminalId: terminalId,
          operatingMode: mode,
          capabilities,
          terminalName: terminalName ?? null,
        });
      },
      setActiveCashShiftId(shiftId) {
        set({
          activeCashShiftId: shiftId,
          activeCashShiftCheckedAt: shiftId ? Date.now() : null,
        });
      },
      setActiveCashShiftCheckAt(checkedAt) {
        set({ activeCashShiftCheckedAt: checkedAt });
      },
      setTerminalName(name) {
        set({ terminalName: name });
      },
      clearSelected() {
        set({
          selectedTerminalId: null,
          operatingMode: null,
          capabilities: null,
          activeCashShiftId: null,
          activeCashShiftCheckedAt: null,
          terminalName: null,
        });
      },
    }),
    {
      name: 'terminal-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
