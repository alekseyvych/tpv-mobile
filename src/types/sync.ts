export type SyncHttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type SyncStatus = 'queued' | 'syncing' | 'failed';

export type QueuedSyncOperation = {
  id: string;
  url: string;
  method: SyncHttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  body?: unknown;
  status: SyncStatus;
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
};

export type SyncProgress = {
  total: number;
  processed: number;
  success: number;
  failed: number;
};
