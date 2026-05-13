import axios from 'axios';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { useAnalyticsStore } from '@/store/analytics.store';
import { useAuthStore } from '@/store/auth.store';
import type { AnalyticsContext, AnalyticsEvent, AnalyticsEventName } from '@/types/analytics';
import { getAnalyticsEventQueue, setAnalyticsEventQueue } from '@/utils/storage';

const FLUSH_INTERVAL_MS = 60_000;
const MAX_BATCH_SIZE = 25;

function nextId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class AnalyticsService {
  private initialized = false;

  private intervalRef: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const stored = await getAnalyticsEventQueue<AnalyticsEvent[]>();
    useAnalyticsStore.getState().setQueue(Array.isArray(stored) ? stored : []);

    this.intervalRef = setInterval(() => {
      void this.flushQueue();
    }, FLUSH_INTERVAL_MS);

    this.initialized = true;
  }

  shutdown(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
    this.initialized = false;
  }

  setContext(context: Partial<AnalyticsContext>): void {
    useAnalyticsStore.getState().mergeContext(context);
  }

  async trackEvent(name: AnalyticsEventName, properties?: Record<string, unknown>): Promise<void> {
    const analytics = useAnalyticsStore.getState();
    const auth = useAuthStore.getState();
    const event: AnalyticsEvent = {
      id: nextId(),
      name,
      timestamp: new Date().toISOString(),
      properties,
      context: {
        ...analytics.context,
        userId: analytics.context.userId ?? auth.user?.id,
        tenantId: analytics.context.tenantId ?? auth.user?.tenantId,
        os: Platform.OS,
      },
    };

    const queue = [...analytics.queue, event];
    analytics.setQueue(queue);
    await setAnalyticsEventQueue(queue);

    if (queue.length >= MAX_BATCH_SIZE) {
      await this.flushQueue();
    }
  }

  async trackError(error: unknown, context?: Record<string, unknown>): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await this.trackEvent('error.captured', {
      message,
      ...(context ?? {}),
    });
  }

  async flushQueue(): Promise<void> {
    const analytics = useAnalyticsStore.getState();
    if (analytics.queue.length === 0) return;

    const batch = analytics.queue.slice(0, MAX_BATCH_SIZE);
    const token = useAuthStore.getState().accessToken;

    try {
      await axios.post(
        `${env.apiBaseUrl}/analytics/events/batch`,
        { events: batch },
        {
          timeout: env.apiTimeoutReports,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      const rest = analytics.queue.slice(batch.length);
      analytics.setQueue(rest);
      await setAnalyticsEventQueue(rest);
    } catch {
      // Keep events queued when analytics endpoint is unavailable.
    }
  }
}

export const analyticsService = new AnalyticsService();
