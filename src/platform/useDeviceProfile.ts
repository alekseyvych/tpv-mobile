/**
 * Device Profile Detection Hook
 *
 * Determines the device type (phone/tablet) and layout mode based on screen dimensions.
 * Used throughout the app to adapt layouts and navigation patterns.
 *
 * Layout Rules:
 * - Phone: < 768px width
 * - Tablet: >= 768px width and < 1024px width (portrait)
 * - Tablet Landscape: >= 768px width and >= 1024px (landscape or very wide)
 * - Orientation: portrait or landscape
 */

import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '@/platform/breakpoints';

export type DeviceType = 'phone' | 'tablet';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceProfile {
  deviceType: DeviceType;
  width: number;
  height: number;
  orientation: Orientation;
  isPhone: boolean;
  isTablet: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

export function useDeviceProfile(): DeviceProfile {
  const { width, height } = useWindowDimensions();

  // Determine device type based on width
  const isPhone = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet;

  // Determine orientation
  const isPortrait = height > width;
  const isLandscape = width > height;

  // On phone in landscape, if too narrow for normal tablet mode,
  // we still treat it as phone with landscape orientation
  const deviceType: DeviceType = isPhone ? 'phone' : 'tablet';

  return {
    deviceType,
    width,
    height,
    orientation: isPortrait ? 'portrait' : 'landscape',
    isPhone,
    isTablet,
    isPortrait,
    isLandscape,
  };
}
