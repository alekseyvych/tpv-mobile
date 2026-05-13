export type AnalyticsEventName =
  | 'app.started'
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.change_password'
  | 'auth.logout'
  | 'auth.logout_all'
  | 'order.created'
  | 'sale.completed'
  | 'payment.completed'
  | 'sync.queue.enqueued'
  | 'sync.queue.flushed'
  | 'error.captured';

export type AnalyticsContext = {
  userId?: string;
  tenantId?: string;
  deviceType?: string;
  appVersion?: string;
  os?: string;
};

export type AnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  timestamp: string;
  properties?: Record<string, unknown>;
  context?: AnalyticsContext;
};
