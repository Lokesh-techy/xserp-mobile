/** @author Lokesh */
import { useEffect, useState } from 'react';

import { syncLabel, useLastSync } from './sync';

/** Re-render once a minute so "Synced 5 minutes ago" stays true (only in the components that show it). */
function useMinuteTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Sync line text for the component that displays it — nothing above it re-renders on sync changes. */
export function useSyncStatus() {
  const at = useLastSync((s) => s.at);
  const syncing = useLastSync((s) => s.syncing);
  const step = useLastSync((s) => s.step);
  const now = useMinuteTick();
  return { text: syncLabel(at, syncing, now, step), syncing };
}

/** The step currently running (for the pull-to-refresh caption). */
export const useSyncStep = () => useLastSync((s) => s.step);
