/** @author Lokesh */
import * as SecureStore from 'expo-secure-store';

/** Keychain/Keystore-backed storage for credentials only (values must stay small, < 2 KB). */
export const secure = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
