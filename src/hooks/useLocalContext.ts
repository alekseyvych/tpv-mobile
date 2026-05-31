import { useCallback } from 'react';

import { useContextStore } from '@/store/context.store';
import type { LocalInstallationContext } from '@/types/store';
import type { LocalInstallationContextDto } from '@/types/api';
import { clearLocalContext, getLocalContext, setLocalContext } from '@/utils/storage';
import { getLocalInstallationContext } from '@/api/context.api';

/**
 * Convert API DTO to store type
 */
function dtoToStore(
  dto: LocalInstallationContextDto | null,
  fallbackDeviceId?: string,
): LocalInstallationContext | null {
  if (!dto) return null;
  return {
    id: dto.id,
    // DTO does not expose a dedicated deviceId field; keep a stable local identifier.
    deviceId: fallbackDeviceId ?? dto.id,
    tenantId: dto.tenantId,
    locationId: dto.locationId,
    terminalId: dto.terminalId,
    installationId: dto.installationId ?? dto.id,
    deviceName: dto.deviceName,
    deviceType: dto.deviceType,
    configuredAt: dto.configuredAt,
  };
}

export function useLocalContext() {
  const localContext = useContextStore((s) => s.localContext);
  const setStoreContext = useContextStore((s) => s.setLocalContext);

  const loadContext = useCallback(async (): Promise<LocalInstallationContext | null> => {
    const stored = await getLocalContext<LocalInstallationContext>();
    if (stored) {
      setStoreContext(stored);
      return stored;
    }

    try {
      const remote = await getLocalInstallationContext();
      const converted = dtoToStore(remote, localContext?.deviceId);
      if (converted) {
        await setLocalContext(converted);
        setStoreContext(converted);
      }
      return converted;
    } catch {
      return null;
    }
  }, [localContext, setStoreContext]);

  const clearContext = useCallback(async (): Promise<void> => {
    await clearLocalContext();
    setStoreContext(null);
  }, [setStoreContext]);

  return {
    localContext,
    loadContext,
    clearContext,
  };
}
