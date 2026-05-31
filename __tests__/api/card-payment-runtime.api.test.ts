import { apiClient } from '@/api/client';
import {
  cancelCardPayment,
  fallbackCardPaymentToExternal,
  startCardPayment,
} from '@/api/card-payment-runtime.api';

describe('card-payment-runtime api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards provided Idempotency-Key for startCardPayment', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'tx-1' } } as never);

    await startCardPayment(
      {
        saleId: 'sale-1',
        amount: 10,
        terminalProfileId: 'profile-1',
        posTerminalId: 'terminal-1',
      },
      'intent-start-1',
    );

    expect(postSpy).toHaveBeenCalledWith(
      '/payments/card-transactions/start',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'intent-start-1' }),
      }),
    );
  });

  it('forwards provided Idempotency-Key for cancelCardPayment', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'tx-1' } } as never);

    await cancelCardPayment('tx-1', 'intent-cancel-1');

    expect(postSpy).toHaveBeenCalledWith(
      '/payments/card-transactions/tx-1/cancel',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'intent-cancel-1' }),
      }),
    );
  });

  it('forwards provided Idempotency-Key for fallbackCardPaymentToExternal', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'tx-1' } } as never);

    await fallbackCardPaymentToExternal(
      'tx-1',
      { externalTerminalProfileId: 'profile-ext-1' },
      'intent-fallback-1',
    );

    expect(postSpy).toHaveBeenCalledWith(
      '/payments/card-transactions/tx-1/fallback-external',
      { externalTerminalProfileId: 'profile-ext-1' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'intent-fallback-1' }),
      }),
    );
  });
});
