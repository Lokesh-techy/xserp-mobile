/** @author Lokesh */
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { syncSession } from '@/core/auth';

/** Keeps permissions, ICD flags and pending counts fresh (auth/json/user_settings/) at mount and on foreground. */
export function useSessionRefresh() {
  useEffect(() => {
    void syncSession().catch(() => undefined);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && void syncSession().catch(() => undefined));
    return () => sub.remove();
  }, []);
}

/** The refresh action alone (no lifecycle effects) — for PullToSync on Home. `force` ignores the freshness window. */
export function useSessionRefreshAction() {
  return useCallback((opts: { force?: boolean } = {}) => syncSession(opts), []);
}
