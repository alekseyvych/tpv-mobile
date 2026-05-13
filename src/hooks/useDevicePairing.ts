import { useCallback } from 'react';

import { completePairing } from '@/api/pairing.api';
import { useContextStore } from '@/store/context.store';
import { usePairingStore } from '@/store/pairing.store';
import { logError, logInfo } from '@/utils/logger';
import { setLocalContext } from '@/utils/storage';

export function useDevicePairing() {
  const setLoading = usePairingStore((s) => s.setLoading);
  const setSuccess = usePairingStore((s) => s.setSuccess);
  const setError = usePairingStore((s) => s.setError);
  const reset = usePairingStore((s) => s.reset);
  const status = usePairingStore((s) => s.status);
  const error = usePairingStore((s) => s.error);
  const lastResult = usePairingStore((s) => s.lastResult);
  const setContext = useContextStore((s) => s.setLocalContext);

  const pairWithToken = useCallback(
    async (token: string, metadata?: { deviceName?: string; installationId?: string }) => {
      setLoading();
      logInfo('pairing.token.start', { tokenPreview: token.slice(0, 8), metadata });
      try {
        const result = await completePairing({ token, ...metadata });
        const context = {
          tenantId: result.tenantId,
          installationId: result.installationId,
          deviceName: result.deviceName ?? undefined,
          deviceType: result.deviceType,
          configuredAt: result.configuredAt,
        };
        await setLocalContext(context);
        setContext(context);
        setSuccess(result);
        logInfo('pairing.token.success', {
          installationId: result.installationId,
          tenantId: result.tenantId,
          deviceType: result.deviceType,
        });
        return result;
      } catch (error) {
        logError('pairing.token.failed', error);
        setError('PAIRING_FAILED');
        throw new Error('PAIRING_FAILED');
      }
    },
    [setContext, setError, setLoading, setSuccess]
  );

  const pairWithManualCode = useCallback(
    async (manualCode: string, metadata?: { deviceName?: string; installationId?: string }) => {
      setLoading();
      logInfo('pairing.manual.start', { manualCodePreview: manualCode.slice(0, 4), metadata });
      try {
        const result = await completePairing({ manualCode, ...metadata });
        const context = {
          tenantId: result.tenantId,
          installationId: result.installationId,
          deviceName: result.deviceName ?? undefined,
          deviceType: result.deviceType,
          configuredAt: result.configuredAt,
        };
        await setLocalContext(context);
        setContext(context);
        setSuccess(result);
        logInfo('pairing.manual.success', {
          installationId: result.installationId,
          tenantId: result.tenantId,
          deviceType: result.deviceType,
        });
        return result;
      } catch (error) {
        logError('pairing.manual.failed', error);
        setError('PAIRING_FAILED');
        throw new Error('PAIRING_FAILED');
      }
    },
    [setContext, setError, setLoading, setSuccess]
  );

  return {
    status,
    error,
    lastResult,
    pairWithToken,
    pairWithManualCode,
    reset,
  };
}
