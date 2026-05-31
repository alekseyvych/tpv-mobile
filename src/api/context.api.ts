import { apiClient } from './client';
import type { LocalInstallationContextDto } from '@/types/api';

/**
 * Get local installation context for this device
 * GET /local-installation-context
 * Returns the device's bound tenant + installation
 */
export async function getLocalInstallationContext(): Promise<LocalInstallationContextDto | null> {
  const { data } = await apiClient.get<LocalInstallationContextDto | null>(
    '/local-installation-context'
  );
  return data;
}

/**
 * Upsert local installation context for this device
 * PUT /local-installation-context
 */
export async function upsertLocalInstallationContext(input: {
  deviceName?: string;
  deviceType?: string;
}): Promise<LocalInstallationContextDto> {
  const { data } = await apiClient.put<LocalInstallationContextDto>(
    '/local-installation-context',
    input
  );
  return data;
}

/**
 * Clear local installation context binding on backend
 * DELETE /local-installation-context
 */
export async function clearLocalInstallationContextRemote(): Promise<void> {
  await apiClient.delete('/local-installation-context');
}
