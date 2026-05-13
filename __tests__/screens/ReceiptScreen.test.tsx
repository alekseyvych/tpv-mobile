import { render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { getSaleReceipt } from '@/api/sales.api';
import i18n from '@/i18n/config';
import { ReceiptScreen } from '@/screens/pos/ReceiptScreen';

jest.mock('@/api/sales.api', () => ({
  getSaleReceipt: jest.fn(),
}));

jest.mock('@/hooks/useSaleFlow', () => ({
  useSaleFlow: () => ({
    lastSaleId: 'sale-1',
  }),
}));

describe('ReceiptScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders backend receipt details', async () => {
    (getSaleReceipt as jest.Mock).mockResolvedValue({
      id: 'r1',
      saleId: 'sale-1',
      saleNumber: 'S-100',
      timestamp: new Date().toISOString(),
      lines: [
        { productName: 'Latte', quantity: 2, unitPrice: 3.5, lineTotal: 7 },
      ],
      subtotal: 6,
      tax: 1,
      total: 7,
      payments: [{ method: 'CARD', amount: 7 }],
      receiptNumber: 'R-1',
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <ReceiptScreen onDone={() => undefined} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByText(/2 x Latte/)).toBeTruthy();
      expect(view.getByText(/Payment CARD: 7.00 EUR/)).toBeTruthy();
    });
  });

  it('shows error when receipt fetch fails', async () => {
    (getSaleReceipt as jest.Mock).mockRejectedValue(new Error('network'));

    const view = render(
      <I18nextProvider i18n={i18n}>
        <ReceiptScreen onDone={() => undefined} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByText(/Receipt details could not be loaded|recibo/i)).toBeTruthy();
    });
  });
});
