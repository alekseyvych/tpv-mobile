import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { listCategories, listProducts } from '@/api/catalog.api';
import i18n from '@/i18n/config';
import { CheckoutScreen } from '@/screens/pos/CheckoutScreen';

const mockAddLine = jest.fn();

jest.mock('@/api/catalog.api', () => ({
  listCategories: jest.fn(),
  listProducts: jest.fn(),
}));

jest.mock('@/hooks/useSaleFlow', () => ({
  useSaleFlow: () => ({
    addLine: mockAddLine,
    total: 0,
    lines: [],
  }),
}));

jest.mock('@/platform/useDeviceProfile', () => ({
  useDeviceProfile: () => ({ isPhone: true }),
}));

describe('CheckoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  async function waitForCatalogLoadCycle(view: ReturnType<typeof render>) {
    await waitFor(() => {
      expect(listCategories).toHaveBeenCalledTimes(1);
      expect(listProducts).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(view.queryByText(/Loading|Cargando/i)).toBeNull();
    });
  }

  it('renders checkout title', async () => {
    (listCategories as jest.Mock).mockResolvedValue([]);
    (listProducts as jest.Mock).mockResolvedValue([]);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <CheckoutScreen onBack={() => undefined} onOpenCart={() => undefined} />
      </I18nextProvider>
    );

    await waitForCatalogLoadCycle(view);

    expect(view.getAllByText(/Checkout|Cobro/).length).toBeGreaterThan(0);
  });

  it('loads products and adds one line to cart', async () => {
    (listCategories as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Coffee' }]);
    (listProducts as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'Latte', categoryId: 'c1', priceGross: 3.5 },
    ]);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <CheckoutScreen onBack={() => undefined} onOpenCart={() => undefined} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByText('Latte')).toBeTruthy();
    });

    fireEvent.press(view.getByText('Latte'));
    expect(mockAddLine).toHaveBeenCalledWith({ productId: 'p1', name: 'Latte', price: 3.5 });
  });

  it('shows catalog load error state', async () => {
    (listCategories as jest.Mock).mockRejectedValue(new Error('network'));
    (listProducts as jest.Mock).mockRejectedValue(new Error('network'));

    const view = render(
      <I18nextProvider i18n={i18n}>
        <CheckoutScreen onBack={() => undefined} onOpenCart={() => undefined} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByText(/Catalog could not be loaded|catálogo/i)).toBeTruthy();
    });
  });

  it('retries catalog load after an error', async () => {
    (listCategories as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([{ id: 'c1', name: 'Coffee' }]);
    (listProducts as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([{ id: 'p1', name: 'Latte', categoryId: 'c1', priceGross: 3.5 }]);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <CheckoutScreen onBack={() => undefined} onOpenCart={() => undefined} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByText(/Catalog could not be loaded|catálogo/i)).toBeTruthy();
    });

    fireEvent.press(view.getByText(/Retry|Reintentar/));

    await waitFor(() => {
      expect(view.getByText('Latte')).toBeTruthy();
    });
  });
});
