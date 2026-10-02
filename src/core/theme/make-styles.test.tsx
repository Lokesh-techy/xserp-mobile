/** @author Lokesh */
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { makeStyles } from './make-styles';
import { ThemeProvider } from './theme-provider';

const useStyles = makeStyles((t) => ({ root: { backgroundColor: t.colors.bg } }));
const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider initialPreference="dark">{children}</ThemeProvider>;

test('builds styles from the active theme and memoises them', async () => {
  const { result, rerender } = await renderHook(() => useStyles(), { wrapper });
  expect(result.current.root.backgroundColor).toBe('#0A111D');
  const first = result.current;
  await rerender({});
  expect(result.current).toBe(first);
});
