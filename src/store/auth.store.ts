import { create } from 'zustand';

import { syncService } from '@/services/SyncService';
import { useSyncStore } from '@/store/sync.store';
import type { AuthUser } from '@/types/store';
import { clearTokens, setTokens } from '@/utils/secure-storage';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isRefreshing: boolean;
  authSessionVersion: number;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  hydrateTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  roles: [],
  permissions: [],
  isAuthenticated: false,
  isRefreshing: false,
  authSessionVersion: 0,
  async setTokens(accessToken, refreshToken) {
    await setTokens(accessToken, refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },
  hydrateTokens(accessToken, refreshToken) {
    set({
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken && refreshToken),
    });
  },
  setUser(user) {
    set({
      user,
      roles: user?.roles ?? [],
      permissions: user?.permissions ?? [],
      authSessionVersion: Date.now(),
    });
  },
  setRefreshing(isRefreshing) {
    set({ isRefreshing });
  },
  async logout() {
    // Logout is an auth boundary: clear queued sync writes to prevent cross-user replay.
    await syncService.clearQueue();
    useSyncStore.getState().setQueue([]);

    await clearTokens();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isRefreshing: false,
      authSessionVersion: Date.now(),
    });
  }
}));
