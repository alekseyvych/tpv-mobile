import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { analyticsService } from '@/services/AnalyticsService';
import { syncService } from '@/services/SyncService';
import type { ApiError } from '@/types/api';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';
import { useTerminalStore } from '@/store/terminal.store';
import { getTenantIdFromToken } from '@/utils/jwt';
import { getRuntimeMetadata } from '@/utils/runtime-metadata';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

function toHeaderRecord(config: InternalAxiosRequestConfig): Record<string, string> {
  const out: Record<string, string> = {};
  if (!config.headers) return out;

  Object.entries(config.headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      out[key] = value;
    }
  });

  return out;
}

function isWriteMethod(method?: string): method is 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
  if (!method) return false;
  const normalized = method.toUpperCase();
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
}

function isQueueCandidate(error: AxiosError, config?: RetriableConfig): boolean {
  if (!config?.url) return false;
  if (config.headers?.['X-Sync-Replay'] === '1') return false;
  if (!isWriteMethod(config.method)) return false;

  const url = config.url.toLowerCase();
  if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
    return false;
  }

  if (url.includes('/observability/log-batches')) {
    return false;
  }

  // Queue only when request did not reach backend (offline/network split).
  return !error.response;
}

export function createCorrelationId(): string {
  return `mob-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildClientMetadataHeaders(correlationId = createCorrelationId()): Record<string, string> {
  const runtime = getRuntimeMetadata();
  const localContext = useContextStore.getState().localContext;
  const selectedTerminalId = useTerminalStore.getState().selectedTerminalId;

  const headers: Record<string, string> = {
    'X-Correlation-ID': correlationId,
    'X-Mobile-App-Version': runtime.appVersion,
    'X-Mobile-Build-Number': runtime.buildNumber,
    'X-Mobile-Runtime-Version': runtime.runtimeVersion,
    'X-Mobile-Platform': runtime.platform,
  };

  if (localContext?.deviceId) {
    headers['X-Device-Id'] = localContext.deviceId;
  }

  if (selectedTerminalId) {
    headers['X-Terminal-Id'] = selectedTerminalId;
  }

  return headers;
}

function normalizeError(error: AxiosError): ApiError {
  const data = error.response?.data as { errorCode?: string; message?: string; details?: Record<string, unknown> } | undefined;
  return {
    status: error.response?.status ?? 500,
    code: data?.errorCode ?? 'UNKNOWN_ERROR',
    message: data?.message ?? error.message,
    details: data?.details
  };
}

async function onRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    const tenantId = getTenantIdFromToken(accessToken);
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
  }
  const clientHeaders = buildClientMetadataHeaders();
  Object.entries(clientHeaders).forEach(([key, value]) => {
    config.headers[key] = value;
  });
  return config;
}

async function refreshAccessToken(): Promise<string | null> {
  const auth = useAuthStore.getState();
  if (!auth.refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${env.apiBaseUrl}/auth/refresh`,
      { refreshToken: auth.refreshToken },
      { timeout: env.apiTimeoutSales }
    );
    await auth.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
  } catch {
    await auth.logout();
    return null;
  }
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutSales
});

apiClient.interceptors.request.use(onRequest);
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshedToken = await refreshPromise;
      if (refreshedToken) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${refreshedToken}`;
        return apiClient.request(config);
      }
    }

    if (isQueueCandidate(error, config) && config?.url && isWriteMethod(config.method)) {
      const queued = await syncService.queueWrite({
        url: config.url,
        method: config.method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        headers: toHeaderRecord(config),
        params: (config.params as Record<string, unknown> | undefined) ?? undefined,
        body: config.data,
      });
      await analyticsService.trackEvent('sync.queue.enqueued', {
        operationId: queued.id,
        method: queued.method,
        url: queued.url,
      });

      return Promise.reject({
        status: 0,
        code: 'SYNC_QUEUED',
        message: 'Request queued for sync when connectivity is restored.',
      } satisfies ApiError);
    }

    return Promise.reject(normalizeError(error));
  }
);
