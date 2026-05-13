import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export async function isOnlineNow(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function subscribeOnlineStatus(onChange: (online: boolean, state: NetInfoState) => void): () => void {
  return NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    onChange(online, state);
  });
}

export function useOfflineDetection() {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let mounted = true;

    void isOnlineNow().then((online) => {
      if (mounted) {
        setIsOnline(online);
      }
    });

    const unsubscribe = subscribeOnlineStatus((online) => {
      setIsConnecting(false);
      setIsOnline(online);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    isOnline,
    isConnecting,
    onOnline(callback: () => void) {
      if (isOnline) callback();
    },
    onOffline(callback: () => void) {
      if (!isOnline) callback();
    },
  };
}
