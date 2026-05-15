import { useTerminalStore } from '@/store/terminal.store';

describe('terminal.store', () => {
  beforeEach(() => {
    useTerminalStore.getState().clearSelected();
  });

  it('stores selected terminal mode and capabilities', () => {
    useTerminalStore.getState().setSelectedTerminal('term-1', 'PERSONALIZED', {
      enableDiningFloorAndTables: true,
    });

    const state = useTerminalStore.getState();
    expect(state.selectedTerminalId).toBe('term-1');
    expect(state.operatingMode).toBe('PERSONALIZED');
    expect(state.capabilities).toEqual({ enableDiningFloorAndTables: true });
  });

  it('tracks active cash shift independently from selection', () => {
    useTerminalStore.getState().setSelectedTerminal('term-2', 'RETAIL', null);
    useTerminalStore.getState().setActiveCashShiftId('shift-77');

    expect(useTerminalStore.getState().selectedTerminalId).toBe('term-2');
    expect(useTerminalStore.getState().activeCashShiftId).toBe('shift-77');

    useTerminalStore.getState().setActiveCashShiftId(null);
    expect(useTerminalStore.getState().activeCashShiftId).toBeNull();
  });

  it('clearSelected resets all terminal context values', () => {
    useTerminalStore.getState().setSelectedTerminal('term-3', 'RESTAURANT', { station: 'kitchen' });
    useTerminalStore.getState().setActiveCashShiftId('shift-abc');

    useTerminalStore.getState().clearSelected();

    expect(useTerminalStore.getState()).toMatchObject({
      selectedTerminalId: null,
      operatingMode: null,
      capabilities: null,
      activeCashShiftId: null,
    });
  });
});
