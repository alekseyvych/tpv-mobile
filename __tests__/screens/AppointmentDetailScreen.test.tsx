import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { AppointmentDetailScreen } from '@/screens/appointments/AppointmentDetailScreen';

const mockGetAppointmentById = jest.fn();
const mockUpdateAppointment = jest.fn();
const mockCancelAppointment = jest.fn();
const mockSendAppointmentReminder = jest.fn();
const mockGetAppointmentAvailability = jest.fn();

jest.mock('@/api/appointments.api', () => ({
  getAppointmentById: (...args: unknown[]) => mockGetAppointmentById(...args),
  updateAppointment: (...args: unknown[]) => mockUpdateAppointment(...args),
  cancelAppointment: (...args: unknown[]) => mockCancelAppointment(...args),
  sendAppointmentReminder: (...args: unknown[]) => mockSendAppointmentReminder(...args),
  getAppointmentAvailability: (...args: unknown[]) => mockGetAppointmentAvailability(...args),
}));

describe('AppointmentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAppointmentById.mockResolvedValue({
      id: 'a1',
      customerId: 'c1',
      customerName: 'Ana',
      type: 'repair',
      title: 'Brake check',
      startTime: '2026-05-11T10:00:00Z',
      endTime: '2026-05-11T11:00:00Z',
      duration: 60,
      status: 'scheduled',
      assignedTo: null,
      assignedToName: null,
      reminderSent: false,
      createdAt: '2026-05-11T00:00:00Z',
      updatedAt: '2026-05-11T00:00:00Z',
    });
    mockUpdateAppointment.mockResolvedValue({});
    mockCancelAppointment.mockResolvedValue({});
    mockSendAppointmentReminder.mockResolvedValue(undefined);
    mockGetAppointmentAvailability.mockResolvedValue([]);
  });

  it('loads details and saves updates', async () => {
    const onUpdated = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <AppointmentDetailScreen appointmentId="a1" onBack={() => undefined} onUpdated={onUpdated} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByDisplayValue('Brake check')).toBeTruthy();
    });

    fireEvent.press(view.getByText(/Save changes|Guardar cambios/));

    await waitFor(() => {
      expect(mockUpdateAppointment).toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('renders localized load error instead of raw backend message', async () => {
    mockGetAppointmentById.mockRejectedValueOnce(new Error('sql timeout 500 stack'));

    const view = render(
      <I18nextProvider i18n={i18n}>
        <AppointmentDetailScreen appointmentId="a1" onBack={() => undefined} onUpdated={() => undefined} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(view.getByText(/We could not fetch appointments|No se pudieron cargar las citas/)).toBeTruthy();
    });
    expect(view.queryByText(/sql timeout 500 stack/)).toBeNull();
  });
});
