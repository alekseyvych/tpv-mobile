import type { ReactNode } from 'react';

import { useContextStore } from '@/store/context.store';

type ContextGuardProps = {
  fallback: ReactNode;
  children: ReactNode;
};

export function ContextGuard({ fallback, children }: ContextGuardProps) {
  const setupRequired = useContextStore((s) => s.setupRequired);
  return setupRequired ? fallback : children;
}
