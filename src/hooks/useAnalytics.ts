import { useCallback, useEffect } from 'react';

import { analyticsService } from '@/services/AnalyticsService';
import { useAnalyticsStore } from '@/store/analytics.store';
import type { AnalyticsContext } from '@/types/analytics';

export function useAnalytics() {
  const context = useAnalyticsStore((s) => s.context);

  useEffect(() => {
    void analyticsService.initialize();
    return () => {
      analyticsService.shutdown();
    };
  }, []);

  const setContext = useCallback((partialContext: Partial<AnalyticsContext>) => {
    analyticsService.setContext(partialContext);
  }, []);

  const trackEvent = useCallback(
    async (name: Parameters<typeof analyticsService.trackEvent>[0], properties?: Record<string, unknown>) => {
      await analyticsService.trackEvent(name, properties);
    },
    []
  );

  const trackError = useCallback(async (error: unknown, data?: Record<string, unknown>) => {
    await analyticsService.trackError(error, data);
  }, []);

  return {
    context,
    setContext,
    trackEvent,
    trackError,
  };
}
