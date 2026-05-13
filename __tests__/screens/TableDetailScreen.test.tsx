import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { TableDetailScreen } from '@/screens/dining/TableDetailScreen';
import { restaurantApi } from '@/api/restaurant.api';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetSelectedOrder = jest.fn();

jest.mock('@/api/restaurant.api', () => ({
  restaurantApi: {
    getTableById: jest.fn(),
    getOrderById: jest.fn(),
    updateOrderItemStatus: jest.fn(),
    acquireOrderPaymentLock: jest.fn()
  }
}));

jest.mock('@/store/terminal.store', () => ({
  useTerminalStore: (selector: any) =>
    selector({
      selectedTerminalId: 'terminal-1'
    })
}));

jest.mock('@/store/restaurant.store', () => ({
  useRestaurantStore: (selector: any) =>
    selector({
      selectedTableId: 'table-1',
      setSelectedOrder: mockSetSelectedOrder
    })
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate
  }),
  NavigationProp: {}
}));

describe('TableDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads table and order data', async () => {
    const mockTable = {
      id: 'table-1',
      number: '1',
      status: 'occupied',
      capacity: 4,
      currentOrderId: 'order-1'
    };
    const mockOrder = {
      id: 'order-1',
      items: [{ id: 'item-1', productId: 'prod-1', quantity: 2, status: 'pending' }]
    };

    (restaurantApi.getTableById as jest.Mock).mockResolvedValue(mockTable);
    (restaurantApi.getOrderById as jest.Mock).mockResolvedValue(mockOrder);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TableDetailScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText(/Table 1/)).toBeTruthy();
      expect(view.getByText('order-1')).toBeTruthy();
      expect(mockSetSelectedOrder).toHaveBeenCalledWith('order-1');
    });
  });

  it('shows no order state when table has no active order', async () => {
    const mockTable = {
      id: 'table-1',
      number: '1',
      status: 'available',
      capacity: 4,
      currentOrderId: null
    };

    (restaurantApi.getTableById as jest.Mock).mockResolvedValue(mockTable);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TableDetailScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText(/No active order/i)).toBeTruthy();
      expect(view.getByText(/Create order/i)).toBeTruthy();
      expect(mockSetSelectedOrder).toHaveBeenCalledWith(null);
    });
  });

  it('acquires payment lock and navigates to checkout with restaurant context', async () => {
    const mockTable = {
      id: 'table-1',
      number: '1',
      status: 'occupied',
      capacity: 4,
      currentOrderId: 'order-1'
    };
    const mockOrder = {
      id: 'order-1',
      items: [{ id: 'item-1', productId: 'prod-1', quantity: 1, status: 'pending' }]
    };

    (restaurantApi.getTableById as jest.Mock).mockResolvedValue(mockTable);
    (restaurantApi.getOrderById as jest.Mock).mockResolvedValue(mockOrder);
    (restaurantApi.acquireOrderPaymentLock as jest.Mock).mockResolvedValue({
      ...mockOrder,
      paymentLockedByTerminalId: 'terminal-1'
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TableDetailScreen />
      </I18nextProvider>
    );

    const checkoutButton = await view.findByText(/Checkout/i);
    fireEvent.press(checkoutButton);

    await waitFor(() => {
      expect(restaurantApi.acquireOrderPaymentLock).toHaveBeenCalledWith('order-1', 'terminal-1');
      expect(mockNavigate).toHaveBeenCalledWith('Checkout', {
        source: 'restaurant',
        tableId: 'table-1',
        orderId: 'order-1'
      });
    });
  });
});
