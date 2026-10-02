/** @author Lokesh */
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshSession, useSessionStore } from '@/core/auth';

const MIN_GAP_MS = 5 * 60_000;

/** Keeps permissions, ICD flags and pending counts fresh (auth/json/user_settings/). */
export function useSessionRefresh() {
  const refresh = useCallback(async () => {
    const { session, update } = useSessionStore.getState();
    if (!session) return;
    await update(await refreshSession(session));
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const sub = AppState.addEventListener('change', (state) => {
      const s = useSessionStore.getState().session;
      if (state === 'active' && s && Date.now() - s.refreshedAt > MIN_GAP_MS) void refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh]);

  return refresh;
}

/** The refresh action alone (no lifecycle effects) — for PullToSync on Home. */
export function useSessionRefreshAction() {
  return useCallback(async () => {
    const { session, update } = useSessionStore.getState();
    if (session) await update(await refreshSession(session));
  }, []);
}
