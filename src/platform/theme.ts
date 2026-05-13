/**
 * Mobile/Tablet Design Tokens
 * Extends the existing theme with adaptive colors, spacing, and typography.
 * Aligns with desktop (tpv-front) design system.
 */

import { LAYOUT } from '@/platform/breakpoints';

/**
 * Color tokens (from tpv-front tokens.css, adapted for mobile)
 */
export const colors = {
  // Background
  bgPage: '#f5f5f5',      // Light gray page background
  bgPanel: '#ffffff',     // White card/panel background
  bgSidebar: '#1b2a3b',   // Dark blue sidebar (tablet)
  bgTopbar: '#243447',    // Dark gray topbar
  bgOverlay: 'rgba(0, 0, 0, 0.5)',

  // Text
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  textMuted: '#757575',
  textInverse: '#ffffff',

  // Accent
  accentAction: '#0058cc',  // Primary blue
  focusRing: '#0058cc',
  success: '#007a4d',
  warning: '#996600',
  error: '#d32f2f',

  // Status/semantic
  info: '#0058cc',
  neutral: '#f5f5f5',
  disabled: '#cccccc',
} as const;

/**
 * Typography tokens (from tpv-front)
 */
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 48,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  fontFamily: {
    default: 'System',
    mono: 'Courier',
  },
} as const;

/**
 * Shadow tokens (adapted for React Native)
 */
export const shadows = {
  sm: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  md: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  lg: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
} as const;

/**
 * Animation/timing tokens
 */
export const timing = {
  fast: 80,
  normal: 120,
  medium: 200,
  slow: 300,
} as const;

/**
 * Combined theme export for use in components
 */
export const theme = {
  colors,
  typography,
  spacing: LAYOUT.spacing,
  radius: LAYOUT.radius,
  shadows,
  timing,
} as const;
