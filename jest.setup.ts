/** @author Lokesh */
// In-memory replacements for native storage so core logic is testable in Node.
const mockKvMemory = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (k: string) => mockKvMemory.get(k) ?? null,
    setItemSync: (k: string, v: string) => void mockKvMemory.set(k, v),
    removeItemSync: (k: string) => void mockKvMemory.delete(k),
    clearSync: () => mockKvMemory.clear(),
  },
}));

const mockSecureMemory = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockSecureMemory.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockSecureMemory.set(k, v),
  deleteItemAsync: async (k: string) => void mockSecureMemory.delete(k),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  performAndroidHapticsAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  AndroidHaptics: { Virtual_Key: 'virtual_key' },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { appEnv: 'dev', serverUrl: 'https://dev.xserp.in', idleTimeoutMinutes: 30 } } },
}));

beforeEach(() => {
  mockKvMemory.clear();
  mockSecureMemory.clear();
});

jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  const { useState } = require('react');
  return {
    ...mock,
    useReducedMotion: () => false,
    // The stock mock returns a new shared value every render; the real one is stable (and code relies on it).
    useSharedValue: (init: unknown) => useState(() => mock.useSharedValue(init))[0],
  };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('expo-glass-effect', () => {
  const { View } = require('react-native');
  return { GlassView: View, isLiquidGlassAvailable: () => false, isGlassEffectAPIAvailable: () => false };
});
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-updates', () => ({ updateId: null }));
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View };
});
