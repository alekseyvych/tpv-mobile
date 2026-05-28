import { env } from '@/config/env';
import { mobileLogTransportService } from '@/services/MobileLogTransportService';

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|cookie|api[_-]?key|refresh|card|pan|cvv|cvc|track|expiry|pin/i;
const PAYMENT_DATA_PATTERN = /\b\d{12,19}\b/g;
const BEARER_PATTERN = /bearer\s+[a-z0-9\-._~+/]+=*/gi;

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

function toEntry(message: string, meta: unknown, level: 'debug' | 'info' | 'warn' | 'error') {
  const [component] = message.split('.', 1);
  const normalizedMeta = redactUnknown(meta) as Record<string, unknown> | undefined;

  void mobileLogTransportService.enqueue({
    timestamp: new Date().toISOString(),
    level,
    component: component || 'app',
    eventName: message,
    message,
    correlationId:
      normalizedMeta && typeof normalizedMeta.correlationId === 'string'
        ? normalizedMeta.correlationId
        : undefined,
    screen:
      normalizedMeta && typeof normalizedMeta.screen === 'string' ? normalizedMeta.screen : undefined,
    metadata: normalizedMeta,
  });

  return normalizedMeta;
}

export function logInfo(message: string, meta?: unknown): void {
  const normalizedMeta = toEntry(message, meta, 'info');
  if (env.logLevel === 'debug') {
    // eslint-disable-next-line no-console
    console.info(message, normalizedMeta ?? '');
  }
}

export function logError(message: string, meta?: unknown): void {
  const normalizedMeta = toEntry(message, meta, 'error');
  // eslint-disable-next-line no-console
  console.error(message, normalizedMeta ?? '');
}
