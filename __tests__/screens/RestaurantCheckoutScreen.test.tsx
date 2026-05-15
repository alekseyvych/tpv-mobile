import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import {
  fetchCardPaymentDevSnapshot,
  fetchCardPaymentStatus,
  fetchTerminalPaymentSettings,
  resolveCardPaymentDevOutcome,
  startCardPayment,
} from '@/api/card-payment-runtime.api';
import { getActiveCashShift } from '@/api/cashShifts.api';
import { restaurantApi } from '@/api/restaurant.api';
import { completeSale, getSale, getSaleReceipt } from '@/api/sales.api';
import { getTerminal } from '@/api/terminals.api';
import { RestaurantCheckoutScreen } from '@/screens/dining/RestaurantCheckoutScreen';

const mockOnBack = jest.fn();

jest.mock('@/api/restaurant.api', () => ({
  restaurantApi: {
    getTableById: jest.fn(),
    getOrderById: jest.fn(),
    releaseOrderPaymentLock: jest.fn(),
    getOpenPosSaleResume: jest.fn(),
    createUmbrellaSale: jest.fn(),
    settlePaidGroupItems: jest.fn(),
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

jest.mock('@/api/card-payment-runtime.api', () => ({
  fetchTerminalPaymentSettings: jest.fn(),
  fetchCardPaymentDevSnapshot: jest.fn(),
  fetchCardPaymentStatus: jest.fn(),
  resolveCardPaymentDevOutcome: jest.fn(),
  startCardPayment: jest.fn(),
}));

jest.mock('@/api/terminals.api', () => ({
  getTerminal: jest.fn(),
}));

jest.mock('@/store/terminal.store', () => ({
  useTerminalStore: (selector: (state: { selectedTerminalId: string }) => unknown) =>
    selector({
      selectedTerminalId: 'terminal-1'
    })
}));

function renderScreen() {
  return render(
    <I18nextProvider i18n={i18n}>
      <RestaurantCheckoutScreen tableId="table-1" orderId="order-1" onBack={mockOnBack} />
    </I18nextProvider>
  );
}

describe('RestaurantCheckoutScreen payment flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Force non-dev path so tests validate completeSale payloads directly.
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    (restaurantApi.getTableById as jest.Mock).mockResolvedValue({ id: 'table-1', number: '12' });
    (restaurantApi.getOrderById as jest.Mock).mockResolvedValue({
      id: 'order-1',
      total: 30,
      items: [
        {
          id: 'item-burger',
          productId: 'product-burger',
          productName: 'Hamburger',
          quantity: 1,
          notes: 'well done',
          options: [
            { name: '- Remove', value: 'Onion' },
            { name: '+ Extra', value: 'Bacon (+1.50 EUR)' },
            { name: 'Sauce', value: 'BBQ (+0.50 EUR)' }
          ],
          status: 'served'
        },
        {
          id: 'item-fries',
          productId: 'product-fries',
          productName: 'Fries',
          quantity: 1,
          status: 'served'
        }
      ]
    });
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: {
        'item-burger': 'sale-line-burger',
        'item-fries': 'sale-line-fries'
      }
    });
    (getActiveCashShift as jest.Mock).mockResolvedValue({ id: 'shift-1' });
    (restaurantApi.createUmbrellaSale as jest.Mock).mockResolvedValue({
      sale: { id: 'sale-1' },
      order: {
        id: 'order-1',
        total: 30,
        items: [
          {
            id: 'item-burger',
            productId: 'product-burger',
            productName: 'Hamburger',
            quantity: 1,
            status: 'served'
          },
          {
            id: 'item-fries',
            productId: 'product-fries',
            productName: 'Fries',
            quantity: 1,
            status: 'served'
          }
        ]
      }
    });
    (restaurantApi.settlePaidGroupItems as jest.Mock).mockResolvedValue({
      orderClosed: false,
      remainingItemCount: 1,
    });
    (completeSale as jest.Mock).mockResolvedValue({ id: 'sale-1' });
    (getSale as jest.Mock).mockResolvedValue({
      id: 'sale-resume',
      lines: [
        { id: 'sale-line-burger', productId: 'product-burger', quantity: 1, lineTotal: 12 },
        { id: 'sale-line-fries', productId: 'product-fries', quantity: 1, lineTotal: 18 },
      ]
    });
    (restaurantApi.releaseOrderPaymentLock as jest.Mock).mockResolvedValue({ id: 'order-1' });
    (getSaleReceipt as jest.Mock).mockResolvedValue({ receiptNumber: 'R-1' });
    (fetchTerminalPaymentSettings as jest.Mock).mockResolvedValue({
      terminalId: 'terminal-1',
      defaultPaymentTerminalProfileId: 'profile-1',
      allowOverride: true,
      allowedPaymentTerminalProfileIds: ['profile-1'],
      allowedPaymentTerminalProfiles: [
        { id: 'profile-1', name: 'Main TPV', providerType: 'demo', integrationMode: 'integrated', isActive: true }
      ]
    });
    (getTerminal as jest.Mock).mockResolvedValue({
      id: 'terminal-1',
      name: 'Main Register',
      terminalId: 'T-1'
    });
  });

  it('creates umbrella with option configuration from modified items', async () => {
    let resumeCalls = 0;
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockImplementation(async () => {
      resumeCalls += 1;
      if (resumeCalls === 1) return null;
      return {
        saleId: 'sale-1',
        orderItemIdToSaleLineId: {
          'item-burger': 'sale-line-burger',
          'item-fries': 'sale-line-fries'
        }
      };
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(restaurantApi.createUmbrellaSale).toHaveBeenCalled();
      expect(completeSale).toHaveBeenCalledWith(
        'sale-1',
        [{ method: 'CASH', amount: 30, amountTendered: 30 }],
        undefined,
        { consumeStockLineItemIds: ['sale-line-burger', 'sale-line-fries'] }
      );
    });

    const createBody = (restaurantApi.createUmbrellaSale as jest.Mock).mock.calls[0][1];
    const burgerLine = createBody.lineItems.find(
      (line: { productId: string }) => line.productId === 'product-burger'
    );

    expect(burgerLine).toEqual(
      expect.objectContaining({
        notes: 'well done',
        restaurantOrderItemId: 'item-burger',
        configuration: expect.objectContaining({
          removedIngredients: ['Onion'],
          selectedExtras: [
            expect.objectContaining({ name: 'Bacon', unitPriceDelta: 1.5 })
          ],
          selectedOptions: [
            expect.objectContaining({ groupName: 'Sauce', optionLabel: 'BBQ', priceDelta: 0.5 })
          ]
        })
      })
    );
  });

  it('pays only selected rows in CASH partial payment', async () => {
    const view = renderScreen();

    fireEvent.press(await view.findByText('1x Fries'));
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [{ method: 'CASH', amount: 12, amountTendered: 12 }],
        undefined,
        { consumeStockLineItemIds: ['sale-line-burger'] }
      );
    });

    await waitFor(() => {
      expect(restaurantApi.settlePaidGroupItems).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({
          saleId: 'sale-resume',
          orderItemIds: ['item-burger'],
          saleLineSnapshots: [
            expect.objectContaining({ productId: 'product-burger', quantity: 1, total: 12 })
          ]
        })
      );
    });

    expect(restaurantApi.releaseOrderPaymentLock).not.toHaveBeenCalled();
  });

  it('pays selected rows in CARD partial payment using resume mapping', async () => {
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: {
        'item-burger': 'sale-line-burger',
        'item-fries': 'sale-line-fries'
      }
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText(/pay card/i));
    fireEvent.press(await view.findByText('1x Fries'));
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [{ method: 'CARD', amount: 12 }],
        undefined,
        { consumeStockLineItemIds: ['sale-line-burger'] }
      );
    });
  });

  it('pays selected rows in MIXED partial payment and keeps split exact', async () => {
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: {
        'item-burger': 'sale-line-burger',
        'item-fries': 'sale-line-fries'
      }
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText(/pay mixed/i));
    fireEvent.press(await view.findByText('1x Fries'));
    fireEvent.changeText(await view.findByPlaceholderText(/enter cash amount/i), '5');
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [
          { method: 'CASH', amount: 5, amountTendered: 5 },
          { method: 'CARD', amount: 7 }
        ],
        undefined,
        { consumeStockLineItemIds: ['sale-line-burger'] }
      );
    });
  });

  it('releases lock and loads receipt when order is fully closed', async () => {
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: {
        'item-burger': 'sale-line-burger',
        'item-fries': 'sale-line-fries'
      }
    });
    (restaurantApi.settlePaidGroupItems as jest.Mock).mockResolvedValue({
      orderClosed: true,
      remainingItemCount: 0,
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText(/pay card/i));
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [{ method: 'CARD', amount: 30 }],
        undefined,
        { consumeStockLineItemIds: ['sale-line-burger', 'sale-line-fries'] }
      );
      expect(restaurantApi.releaseOrderPaymentLock).toHaveBeenCalledWith('order-1', 'terminal-1');
      expect(getSaleReceipt).toHaveBeenCalledWith('sale-resume');
    });
  });

  it('blocks payment when selected rows cannot be mapped to sale lines', async () => {
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: {
        // Missing burger mapping on purpose
        'item-fries': 'sale-line-fries'
      }
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText('1x Fries')); // leaves burger selected only
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).not.toHaveBeenCalled();
      expect(restaurantApi.settlePaidGroupItems).not.toHaveBeenCalled();
    });
  });

  it('prevents invalid mixed split when card remainder becomes zero', async () => {
    const view = renderScreen();

    fireEvent.press(await view.findByText(/pay mixed/i));
    fireEvent.changeText(await view.findByPlaceholderText(/enter cash amount/i), '30');
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).not.toHaveBeenCalled();
      expect(restaurantApi.settlePaidGroupItems).not.toHaveBeenCalled();
    });
  });

  it('shows terminal-profile warning and does not attempt card payment when profile missing', async () => {
    (fetchTerminalPaymentSettings as jest.Mock).mockResolvedValue({
      terminalId: 'terminal-1',
      defaultPaymentTerminalProfileId: null,
      allowOverride: true,
      allowedPaymentTerminalProfileIds: [],
      allowedPaymentTerminalProfiles: []
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText(/pay card/i));
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(getTerminal).toHaveBeenCalledWith('terminal-1');
      expect(completeSale).not.toHaveBeenCalled();
    });
  });

  it('dev mixed runtime: approved tx with paymentId only completes cash leg (no duplicate card complete)', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    (startCardPayment as jest.Mock).mockResolvedValue({ id: 'tx-1' });
    (fetchCardPaymentDevSnapshot as jest.Mock).mockResolvedValue({ requestSnapshot: {} });
    (resolveCardPaymentDevOutcome as jest.Mock).mockResolvedValue({});
    (fetchCardPaymentStatus as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      state: 'approved',
      paymentId: 'payment-card-1',
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText(/pay mixed/i));
    fireEvent.press(await view.findByText('1x Fries')); // selected total = 12
    fireEvent.changeText(await view.findByPlaceholderText(/enter cash amount/i), '5');
    fireEvent.press(await view.findByText(/confirm payment/i));

    // Confirm simulator modal action
    fireEvent.press(await view.findByText(/simulate/i));

    await waitFor(() => {
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [{ method: 'CASH', amount: 5, amountTendered: 5 }],
        undefined,
        { consumeStockLineItemIds: ['sale-line-burger'] }
      );
      expect(restaurantApi.settlePaidGroupItems).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({ orderItemIds: ['item-burger'] })
      );
    });
  });

  it('dev card runtime: approved tx with paymentId skips completeSale replay', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    (startCardPayment as jest.Mock).mockResolvedValue({ id: 'tx-2' });
    (fetchCardPaymentDevSnapshot as jest.Mock).mockResolvedValue({ requestSnapshot: {} });
    (resolveCardPaymentDevOutcome as jest.Mock).mockResolvedValue({});
    (fetchCardPaymentStatus as jest.Mock).mockResolvedValue({
      id: 'tx-2',
      state: 'approved',
      paymentId: 'payment-card-2',
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText(/pay card/i));
    fireEvent.press(await view.findByText('1x Fries')); // selected total = 12
    fireEvent.press(await view.findByText(/confirm payment/i));

    fireEvent.press(await view.findByText(/simulate/i));

    await waitFor(() => {
      expect(completeSale).not.toHaveBeenCalled();
      expect(restaurantApi.settlePaidGroupItems).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({
          saleId: 'sale-resume',
          orderItemIds: ['item-burger']
        })
      );
    });
  });

  it('uses mapped sale-line total (not order row total) to avoid exceeding sale total with existing payments', async () => {
    (restaurantApi.getOrderById as jest.Mock).mockResolvedValue({
      id: 'order-1',
      total: 31.15,
      items: [
        {
          id: 'item-burger',
          productId: 'product-burger',
          productName: 'Hamburger',
          quantity: 1,
          status: 'served'
        },
        {
          id: 'item-fries',
          productId: 'product-fries',
          productName: 'Fries',
          quantity: 1,
          status: 'served'
        }
      ]
    });
    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: {
        'item-burger': 'sale-line-burger',
        'item-fries': 'sale-line-fries'
      }
    });
    (getSale as jest.Mock).mockResolvedValue({
      id: 'sale-resume',
      lines: [
        { id: 'sale-line-burger', productId: 'product-burger', quantity: 1, lineTotal: 14.03 },
        { id: 'sale-line-fries', productId: 'product-fries', quantity: 1, lineTotal: 14.02 },
      ]
    });

    const view = renderScreen();

    fireEvent.press(await view.findByText('1x Fries')); // pay burger only
    fireEvent.press(await view.findByText(/pay card/i));
    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [{ method: 'CARD', amount: 14.03 }],
        undefined,
        { consumeStockLineItemIds: ['sale-line-burger'] }
      );
    });
  });

  it('five-item ticket: paying one selected item in CASH uses only that mapped sale line amount', async () => {
    (restaurantApi.getOrderById as jest.Mock).mockResolvedValue({
      id: 'order-1',
      total: 50,
      items: [
        { id: 'item-1', productId: 'p1', productName: 'I1', quantity: 1, status: 'served' },
        { id: 'item-2', productId: 'p2', productName: 'I2', quantity: 1, status: 'served' },
        { id: 'item-3', productId: 'p3', productName: 'I3', quantity: 1, status: 'served' },
        { id: 'item-4', productId: 'p4', productName: 'I4', quantity: 1, status: 'served' },
        { id: 'item-5', productId: 'p5', productName: 'I5', quantity: 1, status: 'served' },
      ]
    });

    (restaurantApi.getOpenPosSaleResume as jest.Mock).mockResolvedValue({
      saleId: 'sale-resume',
      orderItemIdToSaleLineId: {
        'item-1': 'sl-1',
        'item-2': 'sl-2',
        'item-3': 'sl-3',
        'item-4': 'sl-4',
        'item-5': 'sl-5',
      }
    });

    (getSale as jest.Mock).mockResolvedValue({
      id: 'sale-resume',
      lines: [
        { id: 'sl-1', productId: 'p1', quantity: 1, lineTotal: 11.11 },
        { id: 'sl-2', productId: 'p2', quantity: 1, lineTotal: 9.99 },
        { id: 'sl-3', productId: 'p3', quantity: 1, lineTotal: 8.95 },
        { id: 'sl-4', productId: 'p4', quantity: 1, lineTotal: 10.02 },
        { id: 'sl-5', productId: 'p5', quantity: 1, lineTotal: 9.93 },
      ]
    });

    const view = renderScreen();

    // All start selected; unselect 4 so only I1 remains selected.
    fireEvent.press(await view.findByText('1x I2'));
    fireEvent.press(await view.findByText('1x I3'));
    fireEvent.press(await view.findByText('1x I4'));
    fireEvent.press(await view.findByText('1x I5'));

    fireEvent.press(await view.findByText(/confirm payment/i));

    await waitFor(() => {
      expect(completeSale).toHaveBeenCalledWith(
        'sale-resume',
        [{ method: 'CASH', amount: 11.11, amountTendered: 11.11 }],
        undefined,
        { consumeStockLineItemIds: ['sl-1'] }
      );
      expect(restaurantApi.settlePaidGroupItems).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({ orderItemIds: ['item-1'] })
      );
    });
  });
});
