import { apiClient } from './client';
import type {
  AppointmentAvailabilitySlotDto,
  AppointmentCustomerPickDto,
  AppointmentDto,
  AppointmentFiltersDto,
  AppointmentStaffPickDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from '@/types/api';

const FILTER_STATUS_TO_API: Record<string, string> = {
  scheduled: 'SCHEDULED',
  confirmed: 'CONFIRMED',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  no_show: 'NO_SHOW',
};

const FILTER_TYPE_TO_API: Record<string, string> = {
  consultation: 'CONSULTATION',
  repair: 'REPAIR',
  maintenance: 'MAINTENANCE',
  delivery: 'DELIVERY',
  other: 'OTHER',
};

function mapStatus(value: unknown): AppointmentDto['status'] {
  const raw = String(value ?? '').toUpperCase();
  if (raw === 'SCHEDULED') return 'scheduled';
  if (raw === 'CONFIRMED') return 'confirmed';
  if (raw === 'IN_PROGRESS') return 'in_progress';
  if (raw === 'COMPLETED') return 'completed';
  if (raw === 'CANCELLED') return 'cancelled';
  if (raw === 'NO_SHOW') return 'no_show';
  return 'scheduled';
}

function mapType(value: unknown): AppointmentDto['type'] {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'consultation') return 'consultation';
  if (raw === 'repair') return 'repair';
  if (raw === 'maintenance') return 'maintenance';
  if (raw === 'delivery') return 'delivery';
  return 'other';
}

function normalizeAppointment(raw: Record<string, unknown>): AppointmentDto {
  const customerFirstName = String(raw.customerFirstName ?? '');
  const customerLastName = String(raw.customerLastName ?? '');
  const fullName = `${customerFirstName} ${customerLastName}`.trim();
  const startTime = String(raw.startTime ?? raw.scheduledAt ?? raw.startsAt ?? '');
  const endTime = String(raw.endTime ?? '');
  const duration = Number(raw.duration ?? 0) || 0;

  return {
    id: String(raw.id ?? ''),
    customerId: String(raw.customerId ?? ''),
    customerName: String(raw.customerName ?? (fullName || String(raw.customerId ?? ''))),
    customerEmail: raw.customerEmail == null ? undefined : String(raw.customerEmail),
    customerPhone: raw.customerPhone == null ? undefined : String(raw.customerPhone),
    type: mapType(raw.type),
    title: String(raw.title ?? 'Appointment'),
    description: raw.description == null ? undefined : String(raw.description),
    startTime,
    endTime:
      endTime || (startTime ? new Date(new Date(startTime).getTime() + duration * 60000).toISOString() : ''),
    duration,
    status: mapStatus(raw.status),
    assignedTo: raw.assignedTo == null ? null : String(raw.assignedTo),
    assignedToName: raw.assignedToName == null ? null : String(raw.assignedToName),
    notes: raw.notes == null ? undefined : String(raw.notes),
    reminderSent: Boolean(raw.reminderSent),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ''),
    createdBy: raw.createdBy == null ? null : String(raw.createdBy),
  };
}

function toApiCreateAppointmentBody(input: CreateAppointmentDto): Record<string, unknown> {
  return {
    customerId: input.customerId,
    type: input.type.toUpperCase(),
    title: input.title,
    startTime: input.startTime,
    duration: input.duration,
    ...(input.description ? { description: input.description } : {}),
    ...(input.assignedTo ? { assignedTo: input.assignedTo } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
}

function toApiUpdateAppointmentBody(input: UpdateAppointmentDto): Record<string, unknown> {
  return {
    ...(input.type ? { type: input.type.toUpperCase() } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
    ...(input.duration !== undefined ? { duration: input.duration } : {}),
    ...(input.status ? { status: input.status.toUpperCase() } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'assignedTo') ? { assignedTo: input.assignedTo } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}

function toApiAppointmentParams(filters?: AppointmentFiltersDto): Record<string, string | undefined> {
  if (!filters) return {};
  return {
    assignedTo: filters.assignedTo,
    customerId: filters.customerId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    search: filters.search,
    status: filters.status ? (FILTER_STATUS_TO_API[filters.status] ?? filters.status.toUpperCase()) : undefined,
    type: filters.type ? FILTER_TYPE_TO_API[filters.type] : undefined,
  };
}

/**
 * Get appointments with optional filters
 * GET /appointments
 */
export async function getAppointments(filters?: AppointmentFiltersDto): Promise<{ data: AppointmentDto[] }> {
  const { data } = await apiClient.get<unknown>('/appointments', {
    params: toApiAppointmentParams(filters),
  });
  if (!Array.isArray(data)) {
    return { data: [] };
  }

  return {
    data: data
      .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
      .map((row) => normalizeAppointment(row)),
  };
}

/**
 * Get a specific appointment
 * GET /appointments/{appointmentId}
 */
export async function getAppointmentById(appointmentId: string): Promise<AppointmentDto> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/appointments/${appointmentId}`);
  return normalizeAppointment(data);
}

/**
 * Create a new appointment
 * POST /appointments
 */
export async function createAppointment(input: CreateAppointmentDto): Promise<AppointmentDto> {
  const { data } = await apiClient.post<Record<string, unknown>>('/appointments', toApiCreateAppointmentBody(input));
  return normalizeAppointment(data);
}

/**
 * Update an appointment
 * PATCH /appointments/{appointmentId}
 */
export async function updateAppointment(appointmentId: string, input: UpdateAppointmentDto): Promise<AppointmentDto> {
  const { data } = await apiClient.patch<Record<string, unknown>>(
    `/appointments/${appointmentId}`,
    toApiUpdateAppointmentBody(input),
  );
  return normalizeAppointment(data);
}

/**
 * Cancel an appointment
 * POST /appointments/{appointmentId}/cancel
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<AppointmentDto> {
  const { data } = await apiClient.post<Record<string, unknown>>(`/appointments/${appointmentId}/cancel`, {
    reason,
  });
  return normalizeAppointment(data);
}

/**
 * Send reminder for an appointment
 * POST /appointments/{appointmentId}/remind
 */
export async function sendAppointmentReminder(appointmentId: string): Promise<void> {
  await apiClient.post(`/appointments/${appointmentId}/remind`);
}

/**
 * Get available appointment slots
 * GET /appointments/availability
 */
export async function getAppointmentAvailability(params: {
  startDate: string;
  endDate: string;
  userId?: string;
  slotDuration?: number;
}): Promise<AppointmentAvailabilitySlotDto[]> {
  const { data } = await apiClient.get<unknown>('/appointments/availability', {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.slotDuration != null ? { slotDuration: params.slotDuration } : {}),
    },
  });

  if (!Array.isArray(data)) return [];

  return data.map((slot: { start?: unknown; end?: unknown }) => ({
    start: slot.start instanceof Date ? slot.start.toISOString() : String(slot.start ?? ''),
    end: slot.end instanceof Date ? slot.end.toISOString() : String(slot.end ?? ''),
  }));
}

export async function listAppointmentCustomers(search: string, limit = 25): Promise<AppointmentCustomerPickDto[]> {
  const { data } = await apiClient.get<{ data?: Array<Record<string, unknown>> }>('/customers', {
    params: {
      search,
      page: 1,
      limit,
    },
  });

  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.map((row) => {
    const firstName = String(row.firstName ?? '');
    const lastName = String(row.lastName ?? '');
    const full = `${firstName} ${lastName}`.trim();
    return {
      id: String(row.id ?? ''),
      firstName,
      lastName,
      name: String(row.name ?? (full || String(row.id ?? ''))),
    };
  });
}

export async function listAppointmentStaff(limit = 100): Promise<AppointmentStaffPickDto[]> {
  const { data } = await apiClient.get<{ data?: Array<Record<string, unknown>> }>('/users', {
    params: {
      page: 1,
      limit,
    },
  });

  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    firstName: String(row.firstName ?? ''),
    lastName: String(row.lastName ?? ''),
    email: row.email == null ? undefined : String(row.email),
  }));
}
