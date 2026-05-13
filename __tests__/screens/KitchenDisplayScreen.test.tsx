import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { I18nextProvider } from 'react-i18next';

import { theme } from '@/components/theme/theme';
import i18n from '@/i18n/config';
import { KitchenDisplayScreen } from '@/screens/kitchen/KitchenDisplayScreen';

const mockUseKitchenOrders = jest.fn();
const mockUseDeviceProfile = jest.fn();

jest.mock('@/hooks/useKitchenOrders', () => ({
  useKitchenOrders: () => mockUseKitchenOrders(),
}));

jest.mock('@/platform/useDeviceProfile', () => ({
  useDeviceProfile: () => mockUseDeviceProfile(),
}));

function setupDefaultMocks() {
  mockUseDeviceProfile.mockReturnValue({ isPhone: true });
  mockUseKitchenOrders.mockReturnValue({
    items: [
      {
        id: 'i1',
        orderId: 'o1',
        tableNumber: '5',
        productName: 'Burger',
        quantity: 1,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        elapsedMinutes: 3,
      },
    ],
    station: 'kitchen',
    loading: false,
    loadKitchenOrders: jest.fn(async () => []),
    changeStation: jest.fn(async () => []),
    advanceItemStatus: jest.fn(async () => undefined),
  });
}

describe('KitchenDisplayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders kitchen items on phone layout', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <KitchenDisplayScreen onBack={() => undefined} />
      </I18nextProvider>
    );

    expect(view.getAllByText(/Kitchen display|Pantalla de cocina/).length).toBeGreaterThan(0);
    expect(view.getByText('Burger')).toBeTruthy();

    const topbar = view.getByTestId('topbar-container');
    const style = StyleSheet.flatten(topbar.props.style);
    expect(style.paddingTop).toBe(theme.spacing.s3 + 24);
  });

  it('renders loading state text', () => {
    mockUseKitchenOrders.mockReturnValue({
      ...mockUseKitchenOrders(),
      loading: true,
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <KitchenDisplayScreen onBack={() => undefined} />
      </I18nextProvider>
    );

    expect(view.getByText(/Loading|Cargando/)).toBeTruthy();
  });

  it('renders empty state when no items are returned', () => {
    mockUseKitchenOrders.mockReturnValue({
      ...mockUseKitchenOrders(),
      items: [],
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <KitchenDisplayScreen onBack={() => undefined} />
      </I18nextProvider>
    );

    expect(view.getByText(/No pending kitchen items|No hay items pendientes de cocina/)).toBeTruthy();
  });

  it('renders tablet kanban columns', () => {
    mockUseDeviceProfile.mockReturnValue({ isPhone: false });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <KitchenDisplayScreen onBack={() => undefined} />
      </I18nextProvider>
    );

    expect(view.getAllByText(/Pending|Pendiente/).length).toBeGreaterThan(0);
    expect(view.getAllByText(/Preparing|Preparando/).length).toBeGreaterThan(0);
  });
});
