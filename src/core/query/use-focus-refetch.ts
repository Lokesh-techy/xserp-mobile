/** @author Lokesh */
import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';

import { STALE_MS } from './query-client';

/**
 * Navigation focus is not window focus: refetch when the user comes back to a screen after being away longer
 * than STALE_MS. Runs once per return — callers usually pass a callback that changes every render, so it is
 * read through a ref (a dependency on it would refetch on every render while focused).
 */
export function useFocusRefetch(refetch: () => unknown) {
  const latest = useRef(refetch);
  useLayoutEffect(() => {
    latest.current = refetch;
  });
  const blurredAt = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (blurredAt.current !== null && Date.now() - blurredAt.current > STALE_MS) latest.current();
      return () => {
        blurredAt.current = Date.now();
      };
    }, []),
  );
}

/** Combines several queries into one PullToSync handler. */
export function useRefreshAll(queries: { refetch: () => Promise<unknown> }[]) {
  return useCallback(() => Promise.all(queries.map((q) => q.refetch())).then(() => undefined), [queries]);
}
