import axios from 'axios';

import { buildClientMetadataHeaders } from '@/api/client';
import { env } from '@/config/env';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';
import { useTerminalStore } from '@/store/terminal.store';
import {
  getMobileLogQueue,
  setMobileLogQueue,
} from '@/utils/storage';

type MobileLogLevel = 'debug' | 'info' | 'warn' | 'error';

type MobileLogEntry = {
  timestamp: string;
  level: MobileLogLevel;
  component: string;
  eventName: string;
  message: string;
  correlationId?: string;
  screen?: string;
  metadata?: Record<string, unknown>;
};

type QueuedMobileLog = {
  entry: MobileLogEntry;
  retryCount: number;
  nextRetryAt: number;
};

const MAX_QUEUE_SIZE = 400;
const BATCH_SIZE = 40;
const MAX_RETRY_DELAY_MS = 30_000;
const FLUSH_INTERVAL_MS = 15_000;

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|cookie|api[_-]?key|refresh|card|pan|cvv|cvc|track|expiry|pin/i;
const PAYMENT_DATA_PATTERN = /\b\d{12,19}\b/g;
const BEARER_PATTERN = /bearer\s+[a-z0-9\-._~+/]+=*/gi;

function toRetryDelayMs(retryCount: number): number {
  return Math.min(MAX_RETRY_DELAY_MS, 2 ** retryCount * 1000);
}

function redactString(value: string): string {
  return value.replace(BEARER_PATTERN, '[REDACTED_BEARER]').replace(PAYMENT_DATA_PATTERN, '[REDACTED_CARD]');
}

function redactUnknown(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED_DEPTH]';

  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => redactUnknown(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactUnknown(nested, depth + 1);
      }
    }
    return output;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  return value;
}

class MobileLogTransportService {
  private queue: QueuedMobileLog[] = [];

  private loaded = false;

  private flushing = false;

  private flushInterval: ReturnType<typeof setInterval> | null = null;

  private async loadQueue() {
    if (this.loaded) return;
    const stored = await getMobileLogQueue<QueuedMobileLog[]>();
    this.queue = Array.isArray(stored) ? stored : [];
    this.loaded = true;
  }

  private async persistQueue() {
    await setMobileLogQueue(this.queue);
  }

  async enqueue(entry: MobileLogEntry): Promise<void> {
    await this.loadQueue();

    const normalized: QueuedMobileLog = {
      entry: {
        ...entry,
        message: redactString(entry.message).slice(0, 1000),
        metadata: entry.metadata ? (redactUnknown(entry.metadata) as Record<string, unknown>) : undefined,
      },
      retryCount: 0,
      nextRetryAt: Date.now(),
    };

    this.queue.push(normalized);

    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(this.queue.length - MAX_QUEUE_SIZE);
    }

    await this.persistQueue();
    void this.flushNow();
  }

  start() {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => {
      void this.flushNow();
    }, FLUSH_INTERVAL_MS);
  }

  stop() {
    if (!this.flushInterval) return;
    clearInterval(this.flushInterval);
    this.flushInterval = null;
  }

  async flushNow(): Promise<void> {
    if (this.flushing) return;
    await this.loadQueue();

    if (this.queue.length === 0) return;

    const authState = useAuthStore.getState();
    const contextState = useContextStore.getState();
    const terminalState = useTerminalStore.getState();

    const accessToken = authState.accessToken;
    const localContext = contextState.localContext;
    const deviceId = localContext?.deviceId;

    if (!accessToken || !localContext?.tenantId || !deviceId) {
      return;
    }

    const now = Date.now();
    const due = this.queue.filter((item) => item.nextRetryAt <= now).slice(0, BATCH_SIZE);
    if (due.length === 0) return;

    this.flushing = true;

    try {
      const metadataHeaders = buildClientMetadataHeaders();
      const headers: Record<string, string> = {
        ...metadataHeaders,
        Authorization: `Bearer ${accessToken}`,
        'X-Tenant-ID': localContext.tenantId,
        'X-Device-Id': deviceId,
      };

      if (terminalState.selectedTerminalId) {
        headers['X-Terminal-Id'] = terminalState.selectedTerminalId;
      }

      const payload = {
        deviceId,
        terminalId: terminalState.selectedTerminalId || undefined,
        appVersion: metadataHeaders['X-Mobile-App-Version'],
        buildNumber: metadataHeaders['X-Mobile-Build-Number'],
        runtimeVersion: metadataHeaders['X-Mobile-Runtime-Version'],
        platform: metadataHeaders['X-Mobile-Platform'],
        logs: due.map((item) => item.entry),
      };

      await axios.post(`${env.apiBaseUrl}/observability/mobile-logs`, payload, {
        timeout: env.apiTimeoutSales,
        headers,
      });

      const sentSet = new Set(due);
      this.queue = this.queue.filter((item) => !sentSet.has(item));
      await this.persistQueue();
    } catch {
      const failedSet = new Set(due);
      this.queue = this.queue.map((item) => {
        if (!failedSet.has(item)) return item;
        const retryCount = item.retryCount + 1;
        return {
          ...item,
          retryCount,
          nextRetryAt: Date.now() + toRetryDelayMs(retryCount),
        };
      });
      await this.persistQueue();
    } finally {
      this.flushing = false;
    }
  }
}

export const mobileLogTransportService = new MobileLogTransportService();
