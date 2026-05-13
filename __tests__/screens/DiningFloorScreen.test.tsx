import { render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { DiningFloorScreen } from '@/screens/dining/DiningFloorScreen';

jest.mock('@/hooks/useRestaurantOrders', () => ({
  useRestaurantOrders: () => ({
    tables: [
      {
        id: 't1',
        number: '1',
        status: 'available',
        capacity: 4,
        sortOrder: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    loadTables: jest.fn(async () => []),
    selectTable: jest.fn(),
  }),
}));

describe('DiningFloorScreen', () => {
  it('renders title and table entries', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DiningFloorScreen onGoHome={() => undefined} onOpenTable={() => undefined} />
      </I18nextProvider>
    );

    // waitFor flushes the async loadTables effect and drains state updates
    await waitFor(() => {
      expect(view.getByText('Table 1')).toBeTruthy();
    });

    expect(view.getAllByText(/Dining floor|Salón/).length).toBeGreaterThan(0);
  });
});

