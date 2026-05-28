import { useCallback } from 'react';

import { getRuntimeCompatibility } from '@/api/runtime.api';
import { useRuntimeCompatibilityStore } from '@/store/runtime-compatibility.store';

function toLocalStatus(input: {
  status: string;
  updateRequired: boolean;
  updateRecommended: boolean;
}): 'compatible' | 'recommended' | 'required' | 'unknown' {
  if (input.updateRequired || input.status === 'update_required') {
    return 'required';
  }

  if (input.updateRecommended || input.status === 'update_recommended') {
    return 'recommended';
  }

  if (input.status === 'compatible') {
    return 'compatible';
  }

  return 'unknown';
}

export function useRuntimeCompatibility() {
  const status = useRuntimeCompatibilityStore((s) => s.status);
  const code = useRuntimeCompatibilityStore((s) => s.code);
  const message = useRuntimeCompatibilityStore((s) => s.message);
  const updateRequired = useRuntimeCompatibilityStore((s) => s.updateRequired);
  const updateRecommended = useRuntimeCompatibilityStore((s) => s.updateRecommended);
  const setChecking = useRuntimeCompatibilityStore((s) => s.setChecking);
  const setResult = useRuntimeCompatibilityStore((s) => s.setResult);
  const setUnknown = useRuntimeCompatibilityStore((s) => s.setUnknown);

  const checkCompatibility = useCallback(async () => {
    setChecking();
    try {
      const response = await getRuntimeCompatibility();
      setResult({
        status: toLocalStatus(response),
        code: response.code,
        message: response.message,
        updateRequired: response.updateRequired,
        updateRecommended: response.updateRecommended,
        checkedAt: response.checkedAt,
      });
      return response;
    } catch {
      setUnknown({
        code: 'COMPATIBILITY_UNREACHABLE',
        message: 'Compatibility endpoint is unreachable',
      });
      return null;
    }
  }, [setChecking, setResult, setUnknown]);

  return {
    status,
    code,
    message,
    updateRequired,
    updateRecommended,
    checkCompatibility,
  };
}
