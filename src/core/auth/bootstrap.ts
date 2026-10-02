/** @author Lokesh */
import { configureApi } from '../api/client';
import { useSessionStore } from './session-store';

export const SESSION_EXPIRED_NOTICE = 'Your session has ended. Please sign in again.';

/** Call once at module load of the root layout. */
export function bootstrapAuth() {
  configureApi({
    getAuth: () => {
      const s = useSessionStore.getState().session;
      return s ? { token: s.token, userId: s.userId, enterpriseId: s.enterpriseId } : null;
    },
    onSessionExpired: () => void useSessionStore.getState().signOut(SESSION_EXPIRED_NOTICE),
  });
}
