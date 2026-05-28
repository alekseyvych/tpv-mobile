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

describe('api client', () => {
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
});
