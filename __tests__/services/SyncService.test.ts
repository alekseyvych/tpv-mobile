const mockGetSyncOperationQueue = jest.fn();
const mockSetSyncOperationQueue = jest.fn();
const mockAxiosRequest = jest.fn();

jest.mock('@/utils/storage', () => ({
  getSyncOperationQueue: (...args: unknown[]) => mockGetSyncOperationQueue(...args),
  setSyncOperationQueue: (...args: unknown[]) => mockSetSyncOperationQueue(...args),
}));

jest.mock('@/config/env', () => ({
  env: {
    apiBaseUrl: 'https://example.test',
    apiTimeoutSales: 12345,
  },
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    request: (...args: unknown[]) => mockAxiosRequest(...args),
    isAxiosError: (value: unknown) =>
      Boolean(value && typeof value === 'object' && 'response' in (value as Record<string, unknown>)),
  },
}));

describe('SyncService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetSyncOperationQueue.mockResolvedValue([]);
    mockSetSyncOperationQueue.mockResolvedValue(undefined);
  });

  it('queueWrite persists operation and removes sync replay headers', async () => {
    const { syncService } = require('@/services/SyncService');

    const operation = await syncService.queueWrite({
      url: '/orders',
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'X-Sync-Replay': 'should-not-persist',
        'x-sync-internal': 'should-not-persist',
      },
      body: { items: 1 },
    });

    expect(operation.url).toBe('/orders');
    expect(operation.method).toBe('POST');
    expect(operation.status).toBe('queued');
    expect(operation.headers).toEqual({ Authorization: 'Bearer token' });
    expect(mockSetSyncOperationQueue).toHaveBeenCalledWith([
      expect.objectContaining({
        url: '/orders',
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      }),
    ]);
  });

  it('syncQueue removes successful operations and stores empty queue', async () => {
    const { syncService } = require('@/services/SyncService');
    mockAxiosRequest.mockResolvedValue({ status: 200 });

    await syncService.queueWrite({
      url: '/orders/1',
      method: 'PATCH',
      headers: { Authorization: 'Bearer token' },
      body: { status: 'done' },
    });

    const progress = await syncService.syncQueue();

    expect(progress).toEqual({
      total: 1,
      processed: 1,
      success: 1,
      failed: 0,
    });
    expect(syncService.getQueue()).toHaveLength(0);
    expect(mockAxiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://example.test',
        url: '/orders/1',
        method: 'PATCH',
        timeout: 12345,
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'X-Sync-Replay': '1',
        }),
      }),
    );
    expect(mockSetSyncOperationQueue).toHaveBeenLastCalledWith([]);
  });

  it('syncQueue marks failed operations with retry metadata', async () => {
    const { syncService } = require('@/services/SyncService');
    mockAxiosRequest.mockRejectedValue(new Error('offline'));

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2000);

    await syncService.queueWrite({
      url: '/orders/2',
      method: 'POST',
      body: { total: 10 },
    });

    const progress = await syncService.syncQueue();
    const [failedOperation] = syncService.getQueue();

    expect(progress).toEqual({
      total: 1,
      processed: 1,
      success: 0,
      failed: 1,
    });
    expect(failedOperation.status).toBe('failed');
    expect(failedOperation.retryCount).toBe(1);
    expect(failedOperation.lastError).toBe('offline');
    expect(failedOperation.nextRetryAt).toBe(4000);

    nowSpy.mockRestore();
  });

  it('emits progress and supports listener cleanup', async () => {
    const { syncService } = require('@/services/SyncService');
    const listener = jest.fn();

    const unsubscribe = syncService.onSyncProgress(listener);
    await syncService.syncQueue();

    expect(listener).toHaveBeenCalledWith({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
    });

    listener.mockClear();
    unsubscribe();
    await syncService.syncQueue();

    expect(listener).not.toHaveBeenCalled();
  });
});
