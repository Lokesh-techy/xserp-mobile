/** @author Lokesh */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/** Navigation focus is not window focus: refetch stale data when the user comes back to a screen. */
export function useFocusRefetch(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}

/** Combines several queries into one PullToSync handler. */
export function useRefreshAll(queries: { refetch: () => Promise<unknown> }[]) {
  return useCallback(() => Promise.all(queries.map((q) => q.refetch())).then(() => undefined), [queries]);
}
