import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { OrderCreationScreen } from '@/screens/dining/OrderCreationScreen';
import { restaurantApi } from '@/api/restaurant.api';
import { useCatalog } from '@/hooks/useCatalog';

type RestaurantState = {
  selectedTableId: string | null;
  getTableById: (id: string) => any;
  updateTable: jest.Mock;
  setSelectedOrder: jest.Mock;
};

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

let mockRestaurantState: RestaurantState = {
  selectedTableId: 'table-1',
  getTableById: () => ({
    id: 'table-1',
    number: 1,
    status: 'occupied',
    capacity: 4,
    currentOrderId: 'order-1'
  }),
  updateTable: jest.fn(),
  setSelectedOrder: jest.fn()
};

jest.mock('@/api/restaurant.api', () => ({
  restaurantApi: {
    addOrderItem: jest.fn(),
    createOrder: jest.fn(),
    getTableById: jest.fn()
  }
}));

jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: jest.fn()
}));

jest.mock('@/store/restaurant.store', () => ({
  useRestaurantStore: (selector: any) => selector(mockRestaurantState)
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate
  }),
  NavigationProp: {}
}));

describe('OrderCreationScreen', () => {
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Pizza',
      categoryId: 'cat-1',
      unitPrice: 12.99,
      extras: [{ id: 'extra-cheese', name: 'Cheese', priceDelta: 1.5 }],
      removableIngredients: ['Onion']
    },
    { id: 'prod-2', name: 'Pasta', categoryId: 'cat-1', unitPrice: 9.99 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockRestaurantState = {
      selectedTableId: 'table-1',
      getTableById: () => ({
        id: 'table-1',
        number: 1,
        status: 'occupied',
        capacity: 4,
        currentOrderId: 'order-1'
      }),
      updateTable: jest.fn(),
      setSelectedOrder: jest.fn()
    };

    (useCatalog as jest.Mock).mockReturnValue({
      products: mockProducts,
      categories: [],
      isLoading: false,
      error: null
    });

    (restaurantApi.getTableById as jest.Mock).mockResolvedValue({
      id: 'table-1',
      currentOrderId: 'order-1'
    });
  });

  it('adds item to existing active order', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <OrderCreationScreen />
      </I18nextProvider>
    );

    fireEvent.press(await view.findByText('Pizza'));
    fireEvent.press(view.getByText(/Add to order/i));

    await waitFor(() => {
      expect(restaurantApi.addOrderItem).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({ productId: 'prod-1', quantity: 1 })
      );
      expect(restaurantApi.createOrder).not.toHaveBeenCalled();
    });
  });

  it('creates backend order when table has no active order', async () => {
    mockRestaurantState.getTableById = () => ({
      id: 'table-1',
      number: 1,
      status: 'available',
      capacity: 4,
      currentOrderId: null
    });

    (restaurantApi.getTableById as jest.Mock).mockResolvedValue({
      id: 'table-1',
      currentOrderId: null
    });
    (restaurantApi.createOrder as jest.Mock).mockResolvedValue({ id: 'order-new' });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <OrderCreationScreen />
      </I18nextProvider>
    );

    fireEvent.press(await view.findByText('Pizza'));
    fireEvent.press(view.getByText(/Add to order/i));

    await waitFor(() => {
      expect(restaurantApi.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: 'table-1',
          items: [
            expect.objectContaining({
              productId: 'prod-1',
              quantity: 1
            })
          ]
        })
      );
      expect(restaurantApi.addOrderItem).not.toHaveBeenCalled();
      expect(mockRestaurantState.updateTable).toHaveBeenCalledWith('table-1', {
        currentOrderId: 'order-new'
      });
      expect(mockRestaurantState.setSelectedOrder).toHaveBeenCalledWith('order-new');
    });
  });

  it('serializes modifiers payload in backend-compatible options shape', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <OrderCreationScreen />
      </I18nextProvider>
    );

    fireEvent.press(await view.findByText('Pizza'));
    fireEvent.press(view.getByText('Onion'));
    fireEvent.press(view.getByText(/Cheese/));
    fireEvent.press(view.getByText(/Add to order/i));

    await waitFor(() => {
      expect(restaurantApi.addOrderItem).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({
          options: expect.arrayContaining([
            { name: '- Remove', value: 'Onion' },
            { name: '+ Extra', value: 'Cheese (+1.50€)' }
          ])
        })
      );
    });
  });
});
