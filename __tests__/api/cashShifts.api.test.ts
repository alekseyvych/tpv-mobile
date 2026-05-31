import { apiClient } from '@/api/client';
import { openCashShift } from '@/api/cashShifts.api';

describe('cashShifts api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards Idempotency-Key for openCashShift when provided', async () => {
    const opened = {
      id: 'shift-1',
      status: 'OPEN',
      openingBalance: 100,
      openedAt: '2024-01-01T00:00:00Z',
    };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: opened } as never);

    await openCashShift('register-1', 100, 'mobile-shift-open-idem-1');

    expect(spy).toHaveBeenCalledWith(
      '/cash-shifts',
      {
        registerId: 'register-1',
        openingBalance: 100,
      },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-shift-open-idem-1' }),
      }),
    );
  });

  it('generates Idempotency-Key for openCashShift when not provided', async () => {
    const opened = {
      id: 'shift-2',
      status: 'OPEN',
      openingBalance: 200,
      openedAt: '2024-01-01T00:00:00Z',
    };
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: opened } as never);

    await openCashShift('register-2', 200);

    expect(spy).toHaveBeenCalledWith(
      '/cash-shifts',
      {
        registerId: 'register-2',
        openingBalance: 200,
      },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      }),
    );
  });
});
