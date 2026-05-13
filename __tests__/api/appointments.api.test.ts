import { apiClient } from '@/api/client';
import {
  cancelAppointment,
  getAppointmentAvailability,
  getAppointments,
  sendAppointmentReminder,
  updateAppointment,
} from '@/api/appointments.api';

describe('appointments api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads appointments list', async () => {
    const appointments = [
      {
        id: 'a1',
        customerId: 'c1',
        customerName: 'Ana',
        type: 'REPAIR',
        title: 'Brake check',
        startTime: '2026-05-11T10:00:00Z',
        endTime: '2026-05-11T11:00:00Z',
        duration: 60,
        status: 'SCHEDULED',
        reminderSent: false,
        createdAt: '2026-05-11T00:00:00Z',
        updatedAt: '2026-05-11T00:00:00Z',
      },
    ];
    const spy = jest.spyOn(apiClient, 'get').mockResolvedValue({ data: appointments } as never);

    const result = await getAppointments({ status: 'scheduled', search: 'ana' });

    expect(spy).toHaveBeenCalledWith('/appointments', {
      params: {
        assignedTo: undefined,
        customerId: undefined,
        startDate: undefined,
        endDate: undefined,
        search: 'ana',
        status: 'SCHEDULED',
        type: undefined,
      },
    });
    expect(result.data[0].status).toBe('scheduled');
    expect(result.data[0].type).toBe('repair');
  });

  it('updates an appointment', async () => {
    const patchSpy = jest.spyOn(apiClient, 'patch').mockResolvedValue({
      data: {
        id: 'a1',
        customerId: 'c1',
        customerName: 'Ana',
        type: 'REPAIR',
        title: 'Updated',
        startTime: '2026-05-11T10:00:00Z',
        endTime: '2026-05-11T11:00:00Z',
        duration: 60,
        status: 'CONFIRMED',
        reminderSent: false,
        createdAt: '2026-05-11T00:00:00Z',
        updatedAt: '2026-05-11T00:00:00Z',
      },
    } as never);

    const result = await updateAppointment('a1', { title: 'Updated', status: 'confirmed' });

    expect(patchSpy).toHaveBeenCalledWith('/appointments/a1', {
      title: 'Updated',
      status: 'CONFIRMED',
    });
    expect(result.status).toBe('confirmed');
  });

  it('cancels an appointment', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        id: 'a1',
        customerId: 'c1',
        customerName: 'Ana',
        type: 'REPAIR',
        title: 'Brake check',
        startTime: '2026-05-11T10:00:00Z',
        endTime: '2026-05-11T11:00:00Z',
        duration: 60,
        status: 'CANCELLED',
        reminderSent: false,
        createdAt: '2026-05-11T00:00:00Z',
        updatedAt: '2026-05-11T00:00:00Z',
      },
    } as never);

    const result = await cancelAppointment('a1', 'Customer requested reschedule');

    expect(postSpy).toHaveBeenCalledWith('/appointments/a1/cancel', {
      reason: 'Customer requested reschedule',
    });
    expect(result.status).toBe('cancelled');
  });

  it('sends appointment reminder', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: {} } as never);

    await sendAppointmentReminder('a1');

    expect(postSpy).toHaveBeenCalledWith('/appointments/a1/remind');
  });

  it('loads appointment availability', async () => {
    const getSpy = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: [{ start: '2026-05-11T09:00:00Z', end: '2026-05-11T10:00:00Z' }],
    } as never);

    const result = await getAppointmentAvailability({
      startDate: '2026-05-11T00:00:00Z',
      endDate: '2026-05-11T23:59:59Z',
      userId: 'u1',
      slotDuration: 60,
    });

    expect(getSpy).toHaveBeenCalledWith('/appointments/availability', {
      params: {
        startDate: '2026-05-11T00:00:00Z',
        endDate: '2026-05-11T23:59:59Z',
        userId: 'u1',
        slotDuration: 60,
      },
    });
    expect(result).toEqual([{ start: '2026-05-11T09:00:00Z', end: '2026-05-11T10:00:00Z' }]);
  });
});
