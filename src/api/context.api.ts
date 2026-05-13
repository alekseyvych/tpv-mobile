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
 * Create or update local installation context
 * PUT /local-installation-context
 * Called after device pairing to persist the binding
 */
export async function upsertLocalInstallationContext(
  input: Partial<LocalInstallationContextDto>
): Promise<LocalInstallationContextDto> {
  const { data } = await apiClient.put<LocalInstallationContextDto>(
    '/local-installation-context',
    input
  );
  return data;
}

/**
 * Clear local installation context (device reset / unpair)
 * DELETE /local-installation-context
 * Requires confirmation; typically called from admin settings
 */
export async function clearLocalInstallationContextRemote(): Promise<void> {
  await apiClient.delete('/local-installation-context');
}
