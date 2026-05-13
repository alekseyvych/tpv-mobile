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

interface AppShellRouterProps {
  children: ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isRouteEnabled: (route: string) => boolean;
  isKitchenMode?: boolean;
}

export function AppShellRouter({
  children,
  currentRoute,
  onNavigate,
  isRouteEnabled,
  isKitchenMode = false,
}: AppShellRouterProps) {
  const { isPhone } = useDeviceProfile();

  if (isKitchenMode) {
    return <KitchenDisplayShell>{children}</KitchenDisplayShell>;
  }

  if (isPhone) {
    return (
      <PhoneAppShell currentRoute={currentRoute} onNavigate={onNavigate}>
        {children}
      </PhoneAppShell>
    );
  }

  return (
    <TabletAppShell currentRoute={currentRoute} onNavigate={onNavigate} isRouteEnabled={isRouteEnabled}>
      {children}
    </TabletAppShell>
  );
}
