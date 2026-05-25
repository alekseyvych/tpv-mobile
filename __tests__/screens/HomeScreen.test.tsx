import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import type { ComponentProps } from 'react';
import { TextInput } from 'react-native';

import i18n from '@/i18n/config';
import { HomeScreen } from '@/screens/home/HomeScreen';

const mockGetActiveCashShift = jest.fn();
const mockGetKitchenOrders = jest.fn();
const mockGetTerminal = jest.fn();
const mockGetTableById = jest.fn();
const mockGetOrderById = jest.fn();
const mockGetTables = jest.fn();

let mockAuthState: {
  user: { firstName: string; email: string } | null;
  roles: string[];
  permissions: string[];
};

let mockTerminalState: {
  selectedTerminalId: string | null;
  activeCashShiftId: string | null;
  terminalName: string | null;
  setTerminalName: jest.Mock;
};

let mockWaiterHomeState: {
  context: {
    lastTableId: string | null;
    lastOrderId: string | null;
    terminalId: string | null;
    updatedAt: string | null;
  };
  clearResumeContext: jest.Mock;
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

jest.mock('@/api/cashShifts.api', () => ({
  getActiveCashShift: (...args: unknown[]) => mockGetActiveCashShift(...args),
}));

jest.mock('@/api/kitchen.api', () => ({
  getKitchenOrders: (...args: unknown[]) => mockGetKitchenOrders(...args),
}));

jest.mock('@/api/terminals.api', () => ({
  getTerminal: (...args: unknown[]) => mockGetTerminal(...args),
}));

jest.mock('@/api/restaurant.api', () => ({
  restaurantApi: {
    getTableById: (...args: unknown[]) => mockGetTableById(...args),
    getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
    getTables: (...args: unknown[]) => mockGetTables(...args),
  },
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

jest.mock('@/store/terminal.store', () => ({
  useTerminalStore: (selector: (state: typeof mockTerminalState) => unknown) => selector(mockTerminalState),
}));

jest.mock('@/store/waiter-home.store', () => ({
  useWaiterHomeStore: (selector: (state: typeof mockWaiterHomeState) => unknown) => selector(mockWaiterHomeState),
}));

describe('HomeScreen', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      user: { firstName: 'Ana', email: 'ana@example.com' },
      roles: ['waiter'],
      permissions: ['restaurant.read', 'kitchen.read'],
    };

    mockTerminalState = {
      selectedTerminalId: 'term-1',
      activeCashShiftId: 'shift-1',
      terminalName: null,
      setTerminalName: jest.fn(),
    };

    mockWaiterHomeState = {
      context: {
        lastTableId: null,
        lastOrderId: null,
        terminalId: 'term-1',
        updatedAt: null,
      },
      clearResumeContext: jest.fn(),
    };

    mockGetActiveCashShift.mockResolvedValue({ id: 'shift-1' });
    mockGetTerminal.mockResolvedValue({ id: 'term-1', name: 'Main Hall Terminal', terminalId: 'T-01' });
    mockGetKitchenOrders.mockResolvedValue({ data: [] });
    mockGetTableById.mockResolvedValue({ id: 't-1', number: '12', currentOrderId: 'o-1' });
    mockGetOrderById.mockResolvedValue({ id: 'o-1' });
    mockGetTables.mockResolvedValue({ data: [] });
  });

  function renderScreen(overrides?: Partial<ComponentProps<typeof HomeScreen>>) {
    const props: ComponentProps<typeof HomeScreen> = {
      onGoDining: jest.fn(),
      onGoDiningFloor: jest.fn(),
      onGoKitchen: jest.fn(),
      onGoBar: jest.fn(),
      onGoPos: jest.fn(),
      onGoAppointments: jest.fn(),
      onGoSettings: jest.fn(),
      onSelectTerminal: jest.fn(),
      onOpenShift: jest.fn(),
      onOpenTableContext: jest.fn(),
      isOnline: true,
      isSyncing: false,
      onSyncNow: jest.fn(),
      ...overrides,
    };

    const view = render(
      <I18nextProvider i18n={i18n}>
        <HomeScreen {...props} />
      </I18nextProvider>,
    );

    return { view, props };
  }

  it('shows terminal selection CTA when terminal is missing', async () => {
    mockTerminalState.selectedTerminalId = null;
    mockTerminalState.activeCashShiftId = null;

    const { view, props } = renderScreen();

    const button = await view.findByText(/Select terminal|Seleccionar terminal/);
    fireEvent.press(button);

    expect(props.onSelectTerminal).toHaveBeenCalledTimes(1);
  });

  it('opens dining from primary CTA when terminal and shift are ready', async () => {
    const { view, props } = renderScreen();

    await waitFor(() => {
      expect(view.getByText(/Shift open|Turno abierto/)).toBeTruthy();
    });

    const candidates = await view.findAllByText(/Open dining floor|Abrir salón/);
    fireEvent.press(candidates[candidates.length - 1]);

    expect(props.onGoDining).toHaveBeenCalledTimes(1);
  });

  it('renders only READY kitchen items in ready-to-serve list', async () => {
    mockGetKitchenOrders.mockResolvedValue({
      data: [
        {
          id: 'order-1',
          tableId: 'table-1',
          tableNumber: '7',
          items: [
            { id: 'i1', productName: 'Bravas', status: 'ready', createdAt: new Date().toISOString() },
            { id: 'i2', productName: 'Soup', status: 'preparing', createdAt: new Date().toISOString() },
          ],
        },
      ],
    });

    const { view } = renderScreen();

    await waitFor(() => {
      expect(view.getByText('Bravas')).toBeTruthy();
    });
    expect(view.queryByText('Soup')).toBeNull();
  });

  it('validates and opens resume table context', async () => {
    mockWaiterHomeState.context = {
      lastTableId: 'table-99',
      lastOrderId: 'order-99',
      terminalId: 'term-1',
      updatedAt: new Date().toISOString(),
    };
    mockGetTableById.mockResolvedValue({ id: 'table-99', number: '99', currentOrderId: 'order-99' });
    mockGetOrderById.mockResolvedValue({ id: 'order-99' });

    const { view, props } = renderScreen();

    const resumeCard = await view.findByText(/Table 99|Mesa 99/);
    fireEvent.press(resumeCard);

    expect(props.onOpenTableContext).toHaveBeenCalledWith('table-99', 'order-99');
  });

  it('debounces table search calls and keeps last query', async () => {
    jest.useFakeTimers();
    mockGetTables.mockResolvedValue({ data: [] });

    const { view } = renderScreen();
    const input = view.UNSAFE_getByType(TextInput);

    fireEvent.changeText(input, 't');
    fireEvent.changeText(input, 'ta');
    fireEvent.changeText(input, 'tab');

    expect(mockGetTables).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(299);
    expect(mockGetTables).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1);
    await waitFor(() => {
      expect(mockGetTables).toHaveBeenCalledTimes(1);
    });
    expect(mockGetTables).toHaveBeenLastCalledWith({ search: 'tab' });
  });

  it('uses terminal name from store cache without refetching terminal details', async () => {
    mockTerminalState.terminalName = 'Cached Terminal';

    const { view } = renderScreen();

    await waitFor(() => {
      expect(view.getByText(/Cached Terminal/)).toBeTruthy();
    });

    expect(mockGetTerminal).not.toHaveBeenCalled();
  });
});