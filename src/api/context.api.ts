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
