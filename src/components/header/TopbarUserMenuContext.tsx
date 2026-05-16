import { createContext, useContext, type ReactNode } from 'react';

type TopbarUserMenuContextValue = {
  onSwap: () => void;
  onLogout: () => void;
  swapBlocked: boolean;
  swapBlockedMessage: string;
};

const TopbarUserMenuContext = createContext<TopbarUserMenuContextValue | null>(null);

type Props = {
  value: TopbarUserMenuContextValue;
  children: ReactNode;
};

export function TopbarUserMenuProvider({ value, children }: Props) {
  return <TopbarUserMenuContext.Provider value={value}>{children}</TopbarUserMenuContext.Provider>;
}

export function useTopbarUserMenu() {
  return useContext(TopbarUserMenuContext);
}
