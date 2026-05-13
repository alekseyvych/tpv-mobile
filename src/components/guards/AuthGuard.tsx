import { ReactNode } from 'react';

import { useAuthStore } from '@/store/auth.store';

type Props = {
  fallback: ReactNode;
  children: ReactNode;
};

export function AuthGuard({ fallback, children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : fallback;
}
