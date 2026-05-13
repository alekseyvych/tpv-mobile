import axios from 'axios';

import { analyticsService } from '@/services/AnalyticsService';
import { useAnalyticsStore } from '@/store/analytics.store';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAnalyticsStore.setState({
      queue: [],
      context: {},
    });
  });

  afterEach(() => {
    analyticsService.shutdown();
  });

  it('queues events with context', async () => {
    await analyticsService.initialize();
    analyticsService.setContext({ tenantId: 'tenant-1' });

    await analyticsService.trackEvent('app.started', { source: 'test' });

    const queue = useAnalyticsStore.getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0].name).toBe('app.started');
    expect(queue[0].context?.tenantId).toBe('tenant-1');
  });

  it('keeps queue when flush fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('network'));

    await analyticsService.initialize();
    await analyticsService.trackEvent('error.captured', { message: 'boom' });
    await analyticsService.flushQueue();

    expect(useAnalyticsStore.getState().queue.length).toBeGreaterThan(0);
  });
});
