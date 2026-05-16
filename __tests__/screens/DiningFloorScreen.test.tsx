import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { DiningFloorScreen } from '@/screens/dining/DiningFloorScreen';

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

jest.mock('@/api/restaurant.api', () => ({
  restaurantApi: {
    getZoneLayouts: jest.fn(async () => []),
  },
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
});

