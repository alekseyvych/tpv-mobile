import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  fetchTerminalPaymentSettings,
  startCardPayment,
  fetchCardPaymentStatus,
  cancelCardPayment,
} from '@/api/card-payment-runtime.api';
import { useCardPaymentRuntime } from '@/hooks/useCardPaymentRuntime';

jest.mock('@/api/card-payment-runtime.api', () => ({
  fetchTerminalPaymentSettings: jest.fn(),
  startCardPayment: jest.fn(),
  fetchCardPaymentStatus: jest.fn(),
  cancelCardPayment: jest.fn(),
  fallbackCardPaymentToExternal: jest.fn(),
}));

describe('useCardPaymentRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (fetchTerminalPaymentSettings as jest.Mock).mockResolvedValue({
      terminalId: 'terminal-1',
      defaultPaymentTerminalProfileId: 'profile-1',
      allowOverride: true,
      allowedPaymentTerminalProfileIds: ['profile-1'],
      allowedPaymentTerminalProfiles: [
        {
          id: 'profile-1',
          name: 'Main Terminal',
          providerType: 'redsys_tpvpc',
          integrationMode: 'integrated_api',
          isActive: true,
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses the same start idempotency key when retrying the same intent', async () => {
    (startCardPayment as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        id: 'tx-1',
        saleId: 'sale-1',
        posTerminalId: 'terminal-1',
        terminalProfileId: 'profile-1',
        amount: 100,
        currency: 'EUR',
        state: 'waiting',
        providerType: 'redsys_tpvpc',
        integrationMode: 'integrated_api',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    const { result } = renderHook(() => useCardPaymentRuntime());

    await act(async () => {
      result.current.begin('sale-1', 100, 'terminal-1');
    });

    await waitFor(() => {
      expect(startCardPayment).toHaveBeenCalledTimes(1);
      expect(result.current.error?.type).toBe('start');
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(startCardPayment).toHaveBeenCalledTimes(2);
    });

    const firstKey = (startCardPayment as jest.Mock).mock.calls[0][1];
    const secondKey = (startCardPayment as jest.Mock).mock.calls[1][1];

    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toBe(firstKey);
  });

  it('creates a new start idempotency key for a new intent', async () => {
    (startCardPayment as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      saleId: 'sale-1',
      posTerminalId: 'terminal-1',
      terminalProfileId: 'profile-1',
      amount: 100,
      currency: 'EUR',
      state: 'waiting',
      providerType: 'redsys_tpvpc',
      integrationMode: 'integrated_api',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useCardPaymentRuntime());

    await act(async () => {
      result.current.begin('sale-1', 100, 'terminal-1');
    });

    await waitFor(() => {
      expect(startCardPayment).toHaveBeenCalledTimes(1);
    });

    const firstKey = (startCardPayment as jest.Mock).mock.calls[0][1];

    await act(async () => {
      result.current.reset();
      result.current.begin('sale-2', 75, 'terminal-1');
    });

    await waitFor(() => {
      expect(startCardPayment).toHaveBeenCalledTimes(2);
    });

    const secondKey = (startCardPayment as jest.Mock).mock.calls[1][1];

    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toEqual(expect.any(String));
    expect(secondKey).not.toBe(firstKey);
  });

  it('reuses cancel idempotency key for repeated cancel attempts on same transaction', async () => {
    (startCardPayment as jest.Mock).mockResolvedValue({
      id: 'tx-cancel',
      saleId: 'sale-1',
      posTerminalId: 'terminal-1',
      terminalProfileId: 'profile-1',
      amount: 100,
      currency: 'EUR',
      state: 'waiting',
      providerType: 'redsys_tpvpc',
      integrationMode: 'integrated_api',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    (cancelCardPayment as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: 'tx-cancel', state: 'cancelled' });

    const { result } = renderHook(() => useCardPaymentRuntime());

    await act(async () => {
      result.current.begin('sale-1', 100, 'terminal-1');
    });

    await waitFor(() => {
      expect(startCardPayment).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.cancel();
    });

    await act(async () => {
      await result.current.cancel();
    });

    expect(cancelCardPayment).toHaveBeenCalledTimes(2);
    const firstKey = (cancelCardPayment as jest.Mock).mock.calls[0][1];
    const secondKey = (cancelCardPayment as jest.Mock).mock.calls[1][1];
    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toBe(firstKey);
  });
});
