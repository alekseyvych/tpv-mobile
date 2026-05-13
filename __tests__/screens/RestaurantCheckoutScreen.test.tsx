import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { getActiveCashShift } from '@/api/cashShifts.api';
import { restaurantApi } from '@/api/restaurant.api';
import { completeSale, getSale, getSaleReceipt } from '@/api/sales.api';
import { RestaurantCheckoutScreen } from '@/screens/dining/RestaurantCheckoutScreen';

const mockOnBack = jest.fn();

jest.mock('@/api/restaurant.api', () => ({
  restaurantApi: {
    getTableById: jest.fn(),
    getOrderById: jest.fn(),
    releaseOrderPaymentLock: jest.fn(),
    getOpenPosSaleResume: jest.fn(),
    createUmbrellaSale: jest.fn(),
    closeOrder: jest.fn()
  }
}));

jest.mock('@/api/cashShifts.api', () => ({
  getActiveCashShift: jest.fn()
}));

jest.mock('@/api/sales.api', () => ({
  completeSale: jest.fn(),
  getSale: jest.fn(),
  getSaleReceipt: jest.fn()
}));

jest.mock('@/store/terminal.store', () => ({
  useTerminalStore: (selector: any) =>
    selector({
      selectedTerminalId: 'terminal-1'
    })
}));

describe('RestaurantCheckoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (restaurantApi.getTableById as jest.Mock).mockResolvedValue({ id: 'table-1', number: '12' });
    (restaurantApi.getOrderById as jest.Mock).mockResolvedValue({
      id: 'order-1',
      total: 20,
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          quantity: 1,
          notes: 'no onion'
        }
      ]
    });
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue(null);
    (getActiveCashShift as jest.Mock).mockResolvedValue({ id: 'shift-1' });
    (restaurantApi.createUmbrellaSale as jest.Mock).mockResolvedValue({
      sale: { id: 'sale-1' },
      order: {
        id: 'order-1',
        total: 20,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 1
          }
        ]
      }
    });
    (completeSale as jest.Mock).mockResolvedValue({ id: 'sale-1' });
    (restaurantApi.closeOrder as jest.Mock).mockResolvedValue(undefined);
    (restaurantApi.releaseOrderPaymentLock as jest.Mock).mockResolvedValue({ id: 'order-1' });
    (getSaleReceipt as jest.Mock).mockResolvedValue({ receiptNumber: 'R-1' });
    (getSale as jest.Mock).mockResolvedValue({ id: 'sale-1', status: 'COMPLETED' });
  });

  it('releases payment lock when user goes back', async () => {
    (restaurantApi.releaseOrderPaymentLock as jest.Mock).mockResolvedValue({ id: 'order-1' });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <RestaurantCheckoutScreen tableId="table-1" orderId="order-1" onBack={mockOnBack} />
      </I18nextProvider>
    );

    const backButton = await view.findByText(/Back/i);
    fireEvent.press(backButton);

    await waitFor(() => {
      expect(restaurantApi.releaseOrderPaymentLock).toHaveBeenCalledWith('order-1', 'terminal-1');
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  it('keeps user on screen when lock release fails', async () => {
    (restaurantApi.releaseOrderPaymentLock as jest.Mock).mockRejectedValue(
      new Error('network error')
    );

    const view = render(
      <I18nextProvider i18n={i18n}>
        <RestaurantCheckoutScreen tableId="table-1" orderId="order-1" onBack={mockOnBack} />
      </I18nextProvider>
    );

    const backButton = await view.findByText(/Back/i);
    fireEvent.press(backButton);

    await waitFor(() => {
      expect(mockOnBack).not.toHaveBeenCalled();
      expect(view.getByText(/network error/i)).toBeTruthy();
    });
  });

  it('processes cash payment with umbrella creation and closes order', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <RestaurantCheckoutScreen tableId="table-1" orderId="order-1" onBack={mockOnBack} />
      </I18nextProvider>
    );

    const payCashButton = await view.findByText(/Pay cash/i);
    fireEvent.press(payCashButton);

    await waitFor(() => {
      expect(getActiveCashShift).toHaveBeenCalledWith('terminal-1');
      expect(restaurantApi.createUmbrellaSale).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({
          cashShiftId: 'shift-1',
          terminalId: 'terminal-1'
        })
      );
      expect(completeSale).toHaveBeenCalledWith(
        'sale-1',
        [{ method: 'CASH', amount: 20, amountTendered: 20 }],
        undefined,
        { consumeStockLineItemIds: undefined }
      );
      expect(restaurantApi.closeOrder).toHaveBeenCalledWith('order-1');
      expect(restaurantApi.releaseOrderPaymentLock).toHaveBeenCalledWith('order-1', 'terminal-1');
    });
  });

  it('uses resume sale mapping for card payment consume ids', async () => {
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: { 'item-1': 'sale-line-1' }
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <RestaurantCheckoutScreen tableId="table-1" orderId="order-1" onBack={mockOnBack} />
      </I18nextProvider>
    );

    const payCardButton = await view.findByText(/Pay card/i);
    fireEvent.press(payCardButton);

    await waitFor(() => {
      expect(restaurantApi.createUmbrellaSale).not.toHaveBeenCalled();
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [{ method: 'CARD', amount: 20 }],
        undefined,
        { consumeStockLineItemIds: ['sale-line-1'] }
      );
    });
  });

  it('keeps order open when payment fails', async () => {
    (completeSale as jest.Mock).mockRejectedValue(new Error('declined'));

    const view = render(
      <I18nextProvider i18n={i18n}>
        <RestaurantCheckoutScreen tableId="table-1" orderId="order-1" onBack={mockOnBack} />
      </I18nextProvider>
    );

    const payCashButton = await view.findByText(/Pay cash/i);
    fireEvent.press(payCashButton);

    await waitFor(() => {
      expect(restaurantApi.closeOrder).not.toHaveBeenCalled();
      expect(view.getByText(/declined/i)).toBeTruthy();
    });
  });
});
