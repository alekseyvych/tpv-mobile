import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { DiningFloorScreen } from '@/screens/dining/DiningFloorScreen';
import { getActiveCashShift } from '@/api/cashShifts.api';

let mockTerminalState = {
  selectedTerminalId: 'terminal-1',
  activeCashShiftId: null as string | null,
  activeCashShiftCheckedAt: null as number | null,
  setSelectedTerminal: jest.fn(),
  setActiveCashShiftId: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const React = jest.requireActual('react');
  return {
    ...actual,
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

const mockLoadTables = jest.fn(async () => []);
const mockSelectTable = jest.fn();

jest.mock('@/api/cashShifts.api', () => ({
  getActiveCashShift: jest.fn(),
}));

jest.mock('@/api/restaurant.api', () => ({
  restaurantApi: {
    getZoneLayouts: jest.fn(async () => []),
  },
}));

jest.mock('@/store/terminal.store', () => ({
  useTerminalStore: (selector: (state: typeof mockTerminalState) => unknown) => selector(mockTerminalState),
}));

jest.mock('@/hooks/useRestaurantOrders', () => ({
  useRestaurantOrders: () => ({
    tables: [
      {
        id: 't1',
        number: '1',
        zone: 'Main',
        position: { x: 40, y: 40 },
        status: 'available',
        capacity: 4,
        currentGuestCount: null,
        sortOrder: 1,
        joinGroupId: null,
        billAnchorTableId: null,
        currentOrderId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    loadTables: mockLoadTables,
    selectTable: mockSelectTable,
  }),
}));

describe('DiningFloorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTerminalState = {
      selectedTerminalId: 'terminal-1',
      activeCashShiftId: null,
      activeCashShiftCheckedAt: null,
      setSelectedTerminal: jest.fn(),
      setActiveCashShiftId: jest.fn(),
    };
    (getActiveCashShift as jest.Mock).mockResolvedValue({ id: 'shift-1' });
  });

  it('renders title and table entries', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DiningFloorScreen onGoHome={() => undefined} onOpenTable={() => undefined} />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.queryByText(/Loading tables|Cargando mesas/)).toBeNull();
    });

    fireEvent.press(await view.findByText(/List|Lista/));

    // waitFor flushes the async loadTables effect and drains state updates
    await waitFor(() => {
      expect(view.getByText('Table 1')).toBeTruthy();
    });

    expect(view.getAllByText(/Dining floor|Salón/).length).toBeGreaterThan(0);
  });

  it('skips backend shift check when cached active shift is fresh', async () => {
    mockTerminalState.activeCashShiftId = 'shift-cached';
    mockTerminalState.activeCashShiftCheckedAt = Date.now();

    const onOpenTable = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DiningFloorScreen onGoHome={() => undefined} onOpenTable={onOpenTable} />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.queryByText(/Loading tables|Cargando mesas/)).toBeNull();
    });

    fireEvent.press(await view.findByText(/List|Lista/));
    fireEvent.press(await view.findByText('Table 1'));

    await waitFor(() => {
      expect(onOpenTable).toHaveBeenCalledWith('t1');
    });
    expect(getActiveCashShift).not.toHaveBeenCalled();
  });

  it('calls backend shift check when cache is stale', async () => {
    mockTerminalState.activeCashShiftId = 'shift-stale';
    mockTerminalState.activeCashShiftCheckedAt = Date.now() - 120_000;

    const onOpenTable = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DiningFloorScreen onGoHome={() => undefined} onOpenTable={onOpenTable} />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.queryByText(/Loading tables|Cargando mesas/)).toBeNull();
    });

    fireEvent.press(await view.findByText(/List|Lista/));
    fireEvent.press(await view.findByText('Table 1'));

    await waitFor(() => {
      expect(getActiveCashShift).toHaveBeenCalledWith('terminal-1');
      expect(onOpenTable).toHaveBeenCalledWith('t1');
    });
  });
});

