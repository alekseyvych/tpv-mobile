const mockAxiosPost = jest.fn();
const mockGetMobileLogQueue = jest.fn();
const mockSetMobileLogQueue = jest.fn();
let storedMobileQueue: unknown[] = [];
let mockAuthToken: string | null = 'access-token';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
  },
}));

jest.mock('@/utils/storage', () => ({
  getMobileLogQueue: (...args: unknown[]) => mockGetMobileLogQueue(...args),
  setMobileLogQueue: (...args: unknown[]) => mockSetMobileLogQueue(...args),
}));

jest.mock('@/config/env', () => ({
  env: {
    apiBaseUrl: 'https://example.test',
    apiTimeoutSales: 5000,
  },
}));

jest.mock('@/api/client', () => ({
  buildClientMetadataHeaders: () => ({
    'X-Correlation-ID': 'corr-1',
    'X-Mobile-App-Version': '1.0.0',
    'X-Mobile-Build-Number': '1001',
    'X-Mobile-Runtime-Version': '1.0.0',
    'X-Mobile-Platform': 'android',
  }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: mockAuthToken,
    }),
  },
}));

jest.mock('@/store/context.store', () => ({
  useContextStore: {
    getState: () => ({
      localContext: {
        tenantId: 'tenant-1',
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

describe('MobileLogTransportService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    storedMobileQueue = [];
    mockAuthToken = 'access-token';
    mockGetMobileLogQueue.mockImplementation(async () => storedMobileQueue);
    mockSetMobileLogQueue.mockImplementation(async (value: unknown[]) => {
      storedMobileQueue = Array.isArray(value) ? value : [];
    });
    mockAxiosPost.mockResolvedValue({ status: 201 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enqueues and flushes log batch to backend endpoint', async () => {
    const { mobileLogTransportService } = require('@/services/MobileLogTransportService');

    await mobileLogTransportService.enqueue({
      timestamp: new Date().toISOString(),
      level: 'info',
      component: 'pairing',
      eventName: 'pairing.success',
      message: 'paired successfully',
      metadata: {
        refreshToken: 'should-redact',
      },
    });

    await mobileLogTransportService.flushNow();

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://example.test/observability/mobile-logs',
      expect.objectContaining({
        deviceId: 'device-1',
        logs: expect.arrayContaining([
          expect.objectContaining({
            component: 'pairing',
            eventName: 'pairing.success',
          }),
        ]),
      }),
      expect.objectContaining({
        timeout: 5000,
      }),
    );
  });

  it('does not call backend if auth or pairing state is missing', async () => {
    mockAuthToken = null;

    const { mobileLogTransportService } = require('@/services/MobileLogTransportService');

    await mobileLogTransportService.enqueue({
      timestamp: new Date().toISOString(),
      level: 'warn',
      component: 'sync',
      eventName: 'sync.retry',
      message: 'retrying sync',
    });

    await mobileLogTransportService.flushNow();

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('applies exponential backoff progression on repeated send failures', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-26T12:00:00.000Z'));
    mockAxiosPost.mockRejectedValue(new Error('network-down'));

    const { mobileLogTransportService } = require('@/services/MobileLogTransportService');

    await mobileLogTransportService.enqueue({
      timestamp: new Date().toISOString(),
      level: 'error',
      component: 'sync',
      eventName: 'sync.failure',
      message: 'initial failure',
    });

    await Promise.resolve();

    const firstRetryCount = (storedMobileQueue[0] as Record<string, unknown>).retryCount as number;
    const firstNextRetryAt = (storedMobileQueue[0] as Record<string, unknown>).nextRetryAt as number;

    expect(firstRetryCount).toBeGreaterThanOrEqual(1);
    expect(firstNextRetryAt).toBeGreaterThan(Date.now());

    jest.setSystemTime(new Date(firstNextRetryAt + 10));

    let secondRetryCount = firstRetryCount;
    let secondNextRetryAt = firstNextRetryAt;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await Promise.resolve();
      await mobileLogTransportService.flushNow();

      secondRetryCount = (storedMobileQueue[0] as Record<string, unknown>).retryCount as number;
      secondNextRetryAt = (storedMobileQueue[0] as Record<string, unknown>).nextRetryAt as number;
      if (secondRetryCount >= firstRetryCount + 1) {
        break;
      }
    }

    expect(secondRetryCount).toBeGreaterThanOrEqual(firstRetryCount + 1);
    expect(secondNextRetryAt).toBeGreaterThan(Date.now());
  });

  it('keeps queue bounded and drops oldest entries on overflow', async () => {
    mockAxiosPost.mockRejectedValue(new Error('offline'));
    const { mobileLogTransportService } = require('@/services/MobileLogTransportService');

    for (let i = 0; i < 405; i += 1) {
      await mobileLogTransportService.enqueue({
        timestamp: new Date().toISOString(),
        level: 'info',
        component: 'queue',
        eventName: 'queue.item',
        message: `msg-${i}`,
      });
    }

    const lastQueue = mockSetMobileLogQueue.mock.calls[mockSetMobileLogQueue.mock.calls.length - 1][0];
    expect(lastQueue.length).toBe(400);
    expect(lastQueue[0].entry.message).toBe('msg-5');
    expect(lastQueue[399].entry.message).toBe('msg-404');
  });

  it('flushes buffered logs after auth/pairing transition becomes valid', async () => {
    mockAuthToken = null;

    const { mobileLogTransportService } = require('@/services/MobileLogTransportService');
    await mobileLogTransportService.enqueue({
      timestamp: new Date().toISOString(),
      level: 'warn',
      component: 'auth',
      eventName: 'auth.buffered',
      message: 'buffer until auth',
    });

    await mobileLogTransportService.flushNow();
    expect(mockAxiosPost).not.toHaveBeenCalled();

    mockAuthToken = 'access-token';

    await mobileLogTransportService.flushNow();
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://example.test/observability/mobile-logs',
      expect.any(Object),
      expect.any(Object),
    );
  });
});
