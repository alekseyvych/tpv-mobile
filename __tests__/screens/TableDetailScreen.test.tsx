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
    removeOrderItem: jest.fn(),
    updateOrderItem: jest.fn(),
    updateOrderItemStatus: jest.fn(),
    acquireOrderPaymentLock: jest.fn(),
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
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = effect();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, [effect]);
  },
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
      expect(mockSetSelectedOrder).toHaveBeenCalledWith('order-1');
    });

    // Expand the active order section and assert item content is visible.
    const activeOrderHeader = view.getByText(/Active order/i);
    fireEvent.press(activeOrderHeader);

    await waitFor(() => {
      expect(view.getByText(/2x Item/i)).toBeTruthy();
    });
  });

  it('does not double-load table and order on mount', async () => {
    const mockTable = {
      id: 'table-1',
      number: '1',
      status: 'occupied',
      capacity: 4,
      currentOrderId: 'order-1',
    };
    const mockOrder = {
      id: 'order-1',
      items: [{ id: 'item-1', productId: 'prod-1', quantity: 2, status: 'pending' }],
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
    });

    expect(restaurantApi.getTableById).toHaveBeenCalledTimes(1);
    expect(restaurantApi.getOrderById).toHaveBeenCalledTimes(1);
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

  it('updates local item state after remove/update without full reload', async () => {
    const mockTable = {
      id: 'table-1',
      number: '1',
      status: 'occupied',
      capacity: 4,
      currentOrderId: 'order-1',
    };
    const mockOrder = {
      id: 'order-1',
      items: [{ id: 'item-1', productId: 'prod-1', productName: 'Item', quantity: 2, status: 'pending' }],
    };

    (restaurantApi.getTableById as jest.Mock).mockResolvedValue(mockTable);
    (restaurantApi.getOrderById as jest.Mock).mockResolvedValue(mockOrder);
    (restaurantApi.updateOrderItem as jest.Mock).mockResolvedValue({});
    (restaurantApi.removeOrderItem as jest.Mock).mockResolvedValue({});

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TableDetailScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText(/Table 1/)).toBeTruthy();
    });

    fireEvent.press(view.getByText(/Active order/i));

    await waitFor(() => {
      expect(view.getByText(/2x Item/i)).toBeTruthy();
    });

    fireEvent.press(view.getByText('-'));

    await waitFor(() => {
      expect(view.getByText(/1x Item/i)).toBeTruthy();
    });

    fireEvent.press(view.getByText('x'));

    await waitFor(() => {
      expect(view.getByText(/No items/i)).toBeTruthy();
    });

    expect(restaurantApi.updateOrderItem).toHaveBeenCalledWith('order-1', 'item-1', { quantity: 1 });
    expect(restaurantApi.removeOrderItem).toHaveBeenCalledWith('order-1', 'item-1');
    expect(restaurantApi.getTableById).toHaveBeenCalledTimes(1);
    expect(restaurantApi.getOrderById).toHaveBeenCalledTimes(1);
  });
});
