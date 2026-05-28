import { Platform } from 'react-native';
import packageJson from '../../package.json';

export type RuntimeMetadata = {
  appVersion: string;
  buildNumber: string;
  runtimeVersion: string;
  platform: 'ios' | 'android';
};

function resolveRuntimeVersion(): string {
  return process.env.EXPO_PUBLIC_MOBILE_RUNTIME_VERSION || packageJson.version;
}

function resolveBuildNumber(): string {
  return process.env.EXPO_PUBLIC_MOBILE_BUILD_NUMBER || packageJson.version;
}

export function getRuntimeMetadata(): RuntimeMetadata {
  const appVersion = process.env.EXPO_PUBLIC_MOBILE_APP_VERSION || packageJson.version;

  return {
    appVersion,
    buildNumber: resolveBuildNumber(),
    runtimeVersion: resolveRuntimeVersion(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  };
}
