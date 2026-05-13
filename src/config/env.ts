const defaultApiBaseUrl = process.env.NODE_ENV === 'test' ? 'http://test.local:3000' : 'http://localhost:3000';

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
  apiTimeoutSales: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_SALES ?? 10000),
  apiTimeoutReports: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_REPORTS ?? 30000),
  logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL ?? 'debug',
};
