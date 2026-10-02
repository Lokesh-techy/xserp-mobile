/** @author Lokesh */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { IDLE_NOTICE, isIdleExpired } from './idle-timeout';
import { useSessionStore } from './session-store';

/** Checks every 30 s and on foreground; signs out with a notice once the idle limit passes. */
export function useIdleSignOut() {
  const signedIn = useSessionStore((s) => s.status === 'signedIn');
  useEffect(() => {
    if (!signedIn) return;
    const check = () => {
      if (isIdleExpired()) void useSessionStore.getState().signOut(IDLE_NOTICE);
    };
    const timer = setInterval(check, 30_000);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [signedIn]);
}
