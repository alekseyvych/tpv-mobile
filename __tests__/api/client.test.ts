jest.mock('@/services/AnalyticsService', () => ({
  analyticsService: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('@/services/SyncService', () => ({
  syncService: {
    queueWrite: jest.fn(),
  },
}));

jest.mock('@/utils/runtime-metadata', () => ({
  getRuntimeMetadata: () => ({
    appVersion: '1.0.0',
    buildNumber: '1001',
    runtimeVersion: '1.0.0',
    platform: 'android',
  }),
}));

jest.mock('@/store/context.store', () => ({
  useContextStore: {
    getState: () => ({
      localContext: {
        deviceId: 'device-1',
      },
    }),
  },
}));

jest.mock('@/store/terminal.store', () => ({
  useTerminalStore: {
    getState: () => ({
      selectedTerminalId: 'term-1',
    }),
  },
}));

import { apiClient, buildClientMetadataHeaders } from '@/api/client';
import { analyticsService } from '@/services/AnalyticsService';
import { syncService } from '@/services/SyncService';

function getRejectedInterceptor(): (error: unknown) => Promise<never> {
  const handler = (apiClient.interceptors.response as unknown as { handlers?: Array<{ rejected?: (error: unknown) => Promise<never> }> })
    .handlers?.find((entry) => typeof entry?.rejected === 'function');
  if (!handler?.rejected) {
    throw new Error('Response rejected interceptor not found');
  }
  return handler.rejected;
}

function makeNetworkError(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  headers: Record<string, string> = {},
) {
  return {
    message: 'Network Error',
    config: {
      url,
      method,
      headers,
    },
  };
}

describe('api client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (syncService.queueWrite as jest.Mock).mockResolvedValue({
      id: 'sync-1',
      url: '/sales/sale-1/complete',
      method: 'POST',
    });
  });

  it('has configured base URL', () => {
    expect(apiClient.defaults.baseURL).toBeTruthy();
  });

  it('builds standardized mobile metadata headers', () => {
    const headers = buildClientMetadataHeaders('corr-1');

    expect(headers['X-Correlation-ID']).toBe('corr-1');
    expect(headers['X-Mobile-App-Version']).toBe('1.0.0');
    expect(headers['X-Mobile-Build-Number']).toBe('1001');
    expect(headers['X-Mobile-Runtime-Version']).toBe('1.0.0');
    expect(headers['X-Mobile-Platform']).toBe('android');
    expect(headers['X-Device-Id']).toBe('device-1');
    expect(headers['X-Terminal-Id']).toBe('term-1');
  });

  it('queues replay-safe sales completion on offline network split', async () => {
    const rejected = getRejectedInterceptor();

    await expect(
      rejected(
        makeNetworkError('/sales/sale-1/complete', 'POST', {
          'Idempotency-Key': 'mobile-sync-idem-1',
        }),
      ),
    ).rejects.toMatchObject({
      code: 'SYNC_QUEUED',
    });

    expect(syncService.queueWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/sales/sale-1/complete',
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': 'mobile-sync-idem-1',
        }),
      }),
    );
    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      'sync.queue.enqueued',
      expect.any(Object),
    );
  });

  it('rejects required-key mutation without Idempotency-Key and does not queue it', async () => {
    const rejected = getRejectedInterceptor();

    await expect(rejected(makeNetworkError('/sales/sale-1/complete'))).rejects.toMatchObject({
      code: 'MISSING_IDEMPOTENCY_KEY',
      status: 400,
    });

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });

  it('does not queue quick-access login (auth/session exclusion)', async () => {
    const rejected = getRejectedInterceptor();

    await expect(rejected(makeNetworkError('/auth/quick-access/login'))).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    });

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });

  it('does not queue any auth/session write endpoints in J1 scope', async () => {
    const rejected = getRejectedInterceptor();
    const authEndpoints = [
      '/auth/login',
      '/auth/login-pin',
      '/auth/login/pin',
      '/auth/quick-access/login',
      '/auth/refresh',
      '/auth/logout',
      '/auth/logout-all',
      '/auth/change-password',
    ];

    for (const endpoint of authEndpoints) {
      await expect(rejected(makeNetworkError(endpoint))).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
      });
    }

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });

  it('does not queue change-password (auth/session exclusion)', async () => {
    const rejected = getRejectedInterceptor();

    await expect(rejected(makeNetworkError('/auth/change-password'))).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    });

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });

  it('does not queue card runtime start (real-time exclusion)', async () => {
    const rejected = getRejectedInterceptor();

    await expect(rejected(makeNetworkError('/payments/card-transactions/start'))).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    });

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });

  it('does not queue appointments write (backend-support gap exclusion)', async () => {
    const rejected = getRejectedInterceptor();

    await expect(rejected(makeNetworkError('/appointments'))).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    });

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });

  it('does not queue device pairing completion (security exclusion)', async () => {
    const rejected = getRejectedInterceptor();

    await expect(rejected(makeNetworkError('/device-pairing-sessions/complete'))).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    });

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });

  it('does not queue pairing completion with qr token flow path variants', async () => {
    const rejected = getRejectedInterceptor();
    const endpoints = [
      '/device-pairing-sessions/complete',
      '/device-pairing-sessions/complete?flow=qr',
    ];

    for (const endpoint of endpoints) {
      await expect(rejected(makeNetworkError(endpoint))).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
      });
    }

    expect(syncService.queueWrite).not.toHaveBeenCalled();
  });
});
