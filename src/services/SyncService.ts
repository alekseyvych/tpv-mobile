import axios, { type AxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import type { QueuedSyncOperation, SyncHttpMethod, SyncProgress } from '@/types/sync';
import { getSyncOperationQueue, setSyncOperationQueue } from '@/utils/storage';

type QueueableRequest = {
  url: string;
  method: SyncHttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  body?: unknown;
};

function nextId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRetryDelayMs(retryCount: number): number {
  return Math.min(30_000, 2 ** retryCount * 1000);
}

function safeHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  const normalized: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === 'string' && !key.toLowerCase().startsWith('x-sync-')) {
      normalized[key] = value;
    }
  });
  return normalized;
}

class SyncService {
  private queue: QueuedSyncOperation[] = [];

  private loaded = false;

  private progressListeners = new Set<(progress: SyncProgress) => void>();

  async loadQueue(): Promise<QueuedSyncOperation[]> {
    if (this.loaded) return this.queue;
    const stored = await getSyncOperationQueue<QueuedSyncOperation[]>();
    this.queue = Array.isArray(stored) ? stored : [];
    this.loaded = true;
    return this.queue;
  }

  getQueue(): QueuedSyncOperation[] {
    return this.queue;
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await setSyncOperationQueue([]);
  }

  async queueWrite(request: QueueableRequest): Promise<QueuedSyncOperation> {
    await this.loadQueue();
    const now = Date.now();
    const operation: QueuedSyncOperation = {
      id: nextId(),
      url: request.url,
      method: request.method,
      headers: safeHeaders(request.headers),
      params: request.params,
      body: request.body,
      status: 'queued',
      retryCount: 0,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.queue = [...this.queue, operation];
    await setSyncOperationQueue(this.queue);
    return operation;
  }

  onSyncProgress(listener: (progress: SyncProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private emitProgress(progress: SyncProgress): void {
    this.progressListeners.forEach((listener) => listener(progress));
  }

  async syncQueue(): Promise<SyncProgress> {
    await this.loadQueue();

    const now = Date.now();
    const candidates = this.queue.filter((item) => item.nextRetryAt <= now);

    const progress: SyncProgress = {
      total: candidates.length,
      processed: 0,
      success: 0,
      failed: 0,
    };

    if (candidates.length === 0) {
      this.emitProgress(progress);
      return progress;
    }

    const byId = new Map(this.queue.map((item) => [item.id, item]));

    for (const operation of candidates) {
      const current = byId.get(operation.id);
      if (!current) continue;
      current.status = 'syncing';
      current.updatedAt = Date.now();

      try {
        const requestConfig: AxiosRequestConfig = {
          baseURL: env.apiBaseUrl,
          url: current.url,
          method: current.method,
          headers: {
            ...(current.headers ?? {}),
            'X-Sync-Replay': '1',
          },
          params: current.params,
          data: current.body,
          timeout: env.apiTimeoutSales,
        };
        await axios.request(requestConfig);

        byId.delete(current.id);
        progress.success += 1;
      } catch (error) {
        current.retryCount += 1;
        current.status = 'failed';
        current.lastError = error instanceof Error ? error.message : 'Unknown sync failure';
        current.nextRetryAt = Date.now() + toRetryDelayMs(current.retryCount);
        current.updatedAt = Date.now();
        progress.failed += 1;
      } finally {
        progress.processed += 1;
        this.emitProgress(progress);
      }
    }

    this.queue = Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
    await setSyncOperationQueue(this.queue);

    return progress;
  }
}

export const syncService = new SyncService();
