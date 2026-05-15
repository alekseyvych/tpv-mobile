/**
 * App Shell Router
 *
 * Conditionally renders phone or tablet shell based on device dimensions.
 * This is the root layout component that wraps all navigation.
 *
 * Phone (< 768px): Bottom navigation layout
 * Tablet (>= 768px): Sidebar navigation layout
 */

import { type ReactNode } from 'react';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import { PhoneAppShell } from '@/layouts/PhoneAppShell';
import { TabletAppShell } from '@/layouts/TabletAppShell';
import { KitchenDisplayShell } from '@/layouts/KitchenDisplayShell';
import type { AuthUser } from '@/types/store';

interface AppShellRouterProps {
  children: ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isRouteEnabled: (route: string) => boolean;
  isKitchenMode?: boolean;
  user: AuthUser | null;
  onOpenUserMenu: () => void;
}

export function AppShellRouter({
  children,
  currentRoute,
  onNavigate,
  isRouteEnabled,
  isKitchenMode = false,
  user,
  onOpenUserMenu,
}: AppShellRouterProps) {
  const { isPhone } = useDeviceProfile();

  if (isKitchenMode) {
    return <KitchenDisplayShell>{children}</KitchenDisplayShell>;
  }

  if (isPhone) {
    return (
      <PhoneAppShell currentRoute={currentRoute} onNavigate={onNavigate} user={user} onOpenUserMenu={onOpenUserMenu}>
        {children}
      </PhoneAppShell>
    );
  }

  return (
    <TabletAppShell
      currentRoute={currentRoute}
      onNavigate={onNavigate}
      isRouteEnabled={isRouteEnabled}
      user={user}
      onOpenUserMenu={onOpenUserMenu}
    >
      {children}
    </TabletAppShell>
  );
}
