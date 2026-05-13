import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_CONTEXT_KEY = 'localInstallationContext';
const LANGUAGE_KEY = 'languagePreference';
const OFFLINE_QUEUE_KEY = 'offlineMutationQueue';
const SYNC_QUEUE_KEY = 'syncOperationQueue';
const ANALYTICS_QUEUE_KEY = 'analyticsEventQueue';
const DEVICE_INITIALIZED_KEY = 'deviceInitialized';

async function setJsonValue(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getJsonValue<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setLocalContext(value: unknown): Promise<void> {
  await setJsonValue(LOCAL_CONTEXT_KEY, value);
}

export async function getLocalContext<T>(): Promise<T | null> {
  return getJsonValue<T>(LOCAL_CONTEXT_KEY);
}

export async function clearLocalContext(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_CONTEXT_KEY);
}

export async function setLanguagePreference(language: string): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export async function getLanguagePreference(): Promise<string | null> {
  return AsyncStorage.getItem(LANGUAGE_KEY);
}

export async function setOfflineMutationQueue(value: unknown): Promise<void> {
  await setJsonValue(OFFLINE_QUEUE_KEY, value);
}

export async function getOfflineMutationQueue<T>(): Promise<T | null> {
  return getJsonValue<T>(OFFLINE_QUEUE_KEY);
}

export async function setSyncOperationQueue(value: unknown): Promise<void> {
  await setJsonValue(SYNC_QUEUE_KEY, value);
}

export async function getSyncOperationQueue<T>(): Promise<T | null> {
  return getJsonValue<T>(SYNC_QUEUE_KEY);
}

export async function setAnalyticsEventQueue(value: unknown): Promise<void> {
  await setJsonValue(ANALYTICS_QUEUE_KEY, value);
}

export async function getAnalyticsEventQueue<T>(): Promise<T | null> {
  return getJsonValue<T>(ANALYTICS_QUEUE_KEY);
}

export async function markDeviceInitialized(): Promise<void> {
  await AsyncStorage.setItem(DEVICE_INITIALIZED_KEY, '1');
}

export async function isDeviceInitialized(): Promise<boolean> {
  const value = await AsyncStorage.getItem(DEVICE_INITIALIZED_KEY);
  return value === '1';
}

export async function clearDeviceInitialized(): Promise<void> {
  await AsyncStorage.removeItem(DEVICE_INITIALIZED_KEY);
}
