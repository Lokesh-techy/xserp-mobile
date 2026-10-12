/** @author Lokesh */
import { refreshSession } from './auth-api';
import { useSessionStore } from './session-store';

/** A session younger than this is fresh enough for automatic refreshes (mount, foreground, auto-sync). */
export const SESSION_FRESH_MS = 5 * 60_000;

let inFlight: Promise<void> | null = null;

/**
 * Re-reads permissions, ICD flags and counts (auth/json/user_settings/) into the session store.
 * Concurrent callers share one request; without `force` it is skipped while the session is fresh.
 */
export function syncSession({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (inFlight) return inFlight;
  const session = useSessionStore.getState().session;
  if (!session || (!force && Date.now() - session.refreshedAt < SESSION_FRESH_MS)) return Promise.resolve();
  inFlight = refreshSession(session)
    .then((next) => {
      // Dropped if the user signed out or switched company meanwhile.
      if (useSessionStore.getState().session?.token === session.token) return useSessionStore.getState().update(next);
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
