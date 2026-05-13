/**
 * Responsive Breakpoints
 * Aligns with desktop (tpv-front) responsive design strategy.
 *
 * Reference (from tpv-front):
 * - Mobile: < 768px (drawer sidebar, bottom nav)
 * - Tablet: 768-1024px (collapsed sidebar, tablet content)
 * - Desktop: > 1024px (expanded sidebar, full dashboard)
 *
 * For mobile/tablet, we adapt these for portrait/landscape:
 * - Phone (< 768px): Always bottom navigation, scrollable content
 * - Tablet (>= 768px): Sidebar navigation, dashboard content
 */

export const BREAKPOINTS = {
  /** Phone breakpoint threshold (< 768px = phone, >= 768px = tablet) */
  tablet: 768,
  
  /** Desktop breakpoint (not used in mobile, but documented for clarity) */
  desktop: 1024,
} as const;

/**
 * Layout constants (in dp/px)
 */
export const LAYOUT = {
  // Topbar
  topbarHeight: 56,
  topbarPadding: 16,

  // Bottom navigation (phone only)
  bottomNavHeight: 60,
  bottomNavItemSize: 60,

  // Sidebar (tablet only)
  sidebarCollapsedWidth: 64,
  sidebarExpandedWidth: 240,
  sidebarIconSize: 20,

  // Content area
  contentMaxWidth: 1200,
  contentPaddingHorizontal: 16,
  contentPaddingVertical: 16,

  // Cards and spacing (from tpv-front tokens.css)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 48,
  },

  // Border radius (from tpv-front)
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },

  // Minimum touch target size (mobile accessibility)
  minTouchTarget: 40,

  // Safe area insets are handled by React Native's SafeAreaView
} as const;

/**
 * Media query helpers for responsive components
 * Usage: if (screenWidth >= BREAKPOINTS.tablet) then use tablet layout
 */
export const isPhone = (width: number): boolean => width < BREAKPOINTS.tablet;
export const isTablet = (width: number): boolean => width >= BREAKPOINTS.tablet;
