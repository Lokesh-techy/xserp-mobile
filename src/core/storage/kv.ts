/** @author Lokesh */
import Storage from 'expo-sqlite/kv-store';

/** Synchronous key-value store (SQLite-backed). Never throws: storage failures degrade to "no value". */
export const kv = {
  getString(key: string): string | null {
    try {
      return Storage.getItemSync(key);
    } catch {
      return null;
    }
  },
  setString(key: string, value: string): void {
    try {
      Storage.setItemSync(key, value);
    } catch {
      // A failed preference write must never crash the UI.
    }
  },
  remove(key: string): void {
    try {
      Storage.removeItemSync(key);
    } catch {
      // ignore
    }
  },
  getJSON<T>(key: string): T | null {
    const raw = kv.getString(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJSON(key: string, value: unknown): void {
    kv.setString(key, JSON.stringify(value));
  },
};
