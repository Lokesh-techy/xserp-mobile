/** @author Lokesh */
import { StyleSheet } from 'react-native';

import type { Theme } from './theme';
import { useTheme } from './theme-provider';

/**
 * Declares theme-aware styles once at module level:
 *   const useStyles = makeStyles((t) => ({ root: { backgroundColor: t.colors.bg } }));
 *   const styles = useStyles();
 * Styles are created once per theme and reused (themes have stable identities).
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
