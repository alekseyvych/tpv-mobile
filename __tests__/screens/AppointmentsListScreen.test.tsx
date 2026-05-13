import { render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { AppointmentsListScreen } from '@/screens/appointments/AppointmentsListScreen';

jest.mock('@/api/appointments.api', () => ({
  getAppointments: jest.fn(async () => ({
    data: [
      {
        id: 'a1',
        customerId: 'c1',
        customerName: 'Ana',
        type: 'repair',
        title: 'Brake check',
        startTime: '2026-05-11T10:00:00Z',
        endTime: '2026-05-11T11:00:00Z',
        duration: 60,
        status: 'scheduled',
        reminderSent: false,
        createdAt: '2026-05-11T00:00:00Z',
        updatedAt: '2026-05-11T00:00:00Z',
      },
    ],
  })),
}));

describe('AppointmentsListScreen', () => {
  it('renders appointments title', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <AppointmentsListScreen
          onBack={() => undefined}
          onBook={() => undefined}
          onOpenAppointment={() => undefined}
        />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getAllByText(/Appointments|Citas/).length).toBeGreaterThan(0);
    });
  });
});
