import type { ApiError } from '@/types/api';

export function toApiError(error: unknown): ApiError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const response = (error as {
      response?: {
        status?: number;
        data?: { errorCode?: string; message?: string; details?: Record<string, unknown> };
      };
    }).response;

    return {
      status: response?.status ?? 500,
      code: response?.data?.errorCode ?? 'UNKNOWN_ERROR',
      message: response?.data?.message ?? 'Unexpected error',
      details: response?.data?.details
    };
  }

  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected error'
  };
}
