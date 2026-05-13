import { useEffect, useState } from 'react';

import { useLanguageStore } from '@/store/language.store';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';
import { getLocalContext, isDeviceInitialized } from '@/utils/storage';
import { getTokens } from '@/utils/secure-storage';
import type { LocalInstallationContext } from '@/types/store';

export function useAppInitialization() {
  const initializeLanguage = useLanguageStore((s) => s.initializeLanguage);
  const hydrateTokens = useAuthStore((s) => s.hydrateTokens);
  const setLocalContext = useContextStore((s) => s.setLocalContext);
  const setCheckingContext = useContextStore((s) => s.setCheckingContext);
  const [ready, setReady] = useState(false);
  const [deviceInitialized, setDeviceInitialized] = useState(true); // default true to avoid flash

  useEffect(() => {
    async function init() {
      await initializeLanguage();
      const tokens = await getTokens();
      hydrateTokens(tokens.accessToken, tokens.refreshToken);

      const storedContext = await getLocalContext<LocalInstallationContext>();
      setLocalContext(storedContext);
      setCheckingContext(false);

      const initialized = await isDeviceInitialized();
      setDeviceInitialized(initialized);

      setReady(true);
    }

    void init();
  }, [hydrateTokens, initializeLanguage, setCheckingContext, setLocalContext]);

  return { ready, deviceInitialized };
}
