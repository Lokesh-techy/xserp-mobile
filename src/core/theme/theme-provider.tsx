/** @author Lokesh */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { kv } from '../storage/kv';
import { resolveScheme, themes, type Theme, type ThemePreference } from './theme';

const PREF_KEY = 'xserp.theme';

type ThemeContextValue = { theme: Theme; preference: ThemePreference; setPreference: (p: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  const saved = kv.getString(PREF_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** Live light/dark: follows the OS unless the user picked a scheme; switching never restarts the app. */
export function ThemeProvider({ children, initialPreference }: { children: ReactNode; initialPreference?: ThemePreference }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>(() => initialPreference ?? readPreference());

  const setPreference = useCallback((next: ThemePreference) => {
    kv.setString(PREF_KEY, next);
    // Keeps native UI (date pickers, alerts, keyboards) in step with the app.
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
    setPref(next);
  }, []);

  const scheme = resolveScheme(preference, system);
  const value = useMemo(() => ({ theme: themes[scheme], preference, setPreference }), [scheme, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export const useTheme = (): Theme => useThemeContext().theme;

export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

/** Apply a saved explicit preference to native UI at startup (call once from the root layout). */
export function applySavedAppearance() {
  const pref = readPreference();
  if (pref !== 'system') Appearance.setColorScheme(pref);
}
