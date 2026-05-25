import '@testing-library/jest-native/extend-expect';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const createChain = () => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    const methods = ['maxPointers', 'onChange', 'onEnd', 'maxDistance'];
    methods.forEach((name) => {
      chain[name] = () => chain;
    });
    return chain;
  };

  return {
    GestureHandlerRootView: ({ children, ...props }: { children?: unknown }) =>
      React.createElement(View, props, children),
    GestureDetector: ({ children, ...props }: { children?: unknown }) =>
      React.createElement(View, props, children),
    Gesture: {
      Pan: jest.fn(() => createChain()),
      Pinch: jest.fn(() => createChain()),
      Tap: jest.fn(() => createChain()),
      Simultaneous: jest.fn((...gestures: unknown[]) => gestures),
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: unknown }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'safe-area-provider' }, children);
  },
  SafeAreaView: ({ children, ...props }: { children: unknown }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
  useSafeAreaInsets: () => ({
    top: 24,
    right: 0,
    bottom: 16,
    left: 0,
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const MockIcon = ({ name, ...props }: { name?: string }) =>
    React.createElement(Text, { ...props }, name ?? 'icon');

  return {
    MaterialCommunityIcons: MockIcon,
  };
});

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const Passthrough = ({ children, ...props }: { children?: unknown }) =>
    React.createElement(View, props, children);

  const TextNode = ({ text, children, ...props }: { text?: string; children?: unknown }) =>
    React.createElement(Text, props, text ?? children ?? null);

  return {
    Canvas: Passthrough,
    Fill: Passthrough,
    Group: Passthrough,
    Line: Passthrough,
    Rect: Passthrough,
    RoundedRect: Passthrough,
    Text: TextNode,
    matchFont: jest.fn(() => ({})),
  };
});
