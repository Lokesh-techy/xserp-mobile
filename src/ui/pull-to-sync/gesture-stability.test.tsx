/** @author Lokesh */
import { renderHook } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import { ThemeProvider } from '@/core/theme';

import { usePullToSync } from './use-pull-to-sync';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider initialPreference="light">{children}</ThemeProvider>
);

test('the pull gesture survives re-renders (Android cancels a gesture that is reconfigured mid-pull)', async () => {
  type P = { n: number };
  const { result, rerender } = await renderHook(({ n }: P) => usePullToSync(() => Promise.resolve(n), true), {
    wrapper,
    initialProps: { n: 1 },
  });
  // Each list builds its gestures once from this builder; it must not change between renders.
  const builderOf = (el: ReactElement) => (el.props as { buildPan: unknown }).buildPan;
  const first = builderOf(result.current.attach(<View />));
  await rerender({ n: 2 });
  expect(builderOf(result.current.attach(<View />))).toBe(first);
});
