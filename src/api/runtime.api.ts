import { apiClient } from '@/api/client';
import type { RuntimeCompatibilityResponse } from '@/types/api';

export async function getRuntimeCompatibility(): Promise<RuntimeCompatibilityResponse> {
  const { data } = await apiClient.get<RuntimeCompatibilityResponse>('/runtime/compatibility');
  return data;
}
