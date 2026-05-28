import { useCallback } from 'react';

import { useContextStore } from '@/store/context.store';
import type { LocalInstallationContext } from '@/types/store';
import type { LocalInstallationContextDto } from '@/types/api';
import { clearLocalContext, getLocalContext, setLocalContext } from '@/utils/storage';
import {
  clearLocalInstallationContextRemote,
  getLocalInstallationContext,
  upsertLocalInstallationContext,
} from '@/api/context.api';

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
    deviceId: fallbackDeviceId,
    tenantId: dto.tenantId,
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
  }, [localContext?.deviceId, setStoreContext]);

  const connectContext = useCallback(
    async (input: Partial<LocalInstallationContextDto>): Promise<LocalInstallationContext | null> => {
      try {
        const remote = await upsertLocalInstallationContext(input);
        const converted = dtoToStore(remote, localContext?.deviceId);
        if (converted) {
          await setLocalContext(converted);
          setStoreContext(converted);
        }
        return converted;
      } catch (err) {
        console.error('Failed to connect context:', err);
        return null;
      }
    },
    [localContext?.deviceId, setStoreContext]
  );

  const clearContext = useCallback(async (options?: { clearRemote?: boolean }): Promise<void> => {
    if (options?.clearRemote) {
      await clearLocalInstallationContextRemote();
    }
    await clearLocalContext();
    setStoreContext(null);
  }, [setStoreContext]);

  return {
    localContext,
    loadContext,
    connectContext,
    clearContext,
  };
}
