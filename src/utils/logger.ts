import { env } from '@/config/env';

export function logInfo(message: string, meta?: unknown): void {
  if (env.logLevel === 'debug') {
    // eslint-disable-next-line no-console
    console.info(message, meta ?? '');
  }
}

export function logError(message: string, meta?: unknown): void {
  // eslint-disable-next-line no-console
  console.error(message, meta ?? '');
}
