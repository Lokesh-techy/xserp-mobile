/** @author Lokesh */
import { create } from 'zustand';

import { kv } from '../storage/kv';
import { secure } from '../storage/secure';
import { IDLE_NOTICE, isIdleExpired, resetIdle } from './idle-timeout';
import type { Session } from './types';

// Credentials go to SecureStore (small); the rest of the session (permissions etc.) to kv to stay under 2 KB.
const CREDENTIALS_KEY = 'xserp.credentials.v1';
const PROFILE_KEY = 'xserp.profile.v1';

type Credentials = Pick<Session, 'token' | 'userId' | 'enterpriseId'>;

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  notice: string | null;
  hydrate: () => Promise<void>;
  signIn: (s: Session) => Promise<void>;
  update: (s: Session) => Promise<void>;
  signOut: (notice?: string | null) => Promise<void>;
  clearNotice: () => void;
};

async function persist(s: Session) {
  const { token, userId, enterpriseId, ...profile } = s;
  await secure.set(CREDENTIALS_KEY, JSON.stringify({ token, userId, enterpriseId } satisfies Credentials));
  kv.setJSON(PROFILE_KEY, profile);
}

async function wipe() {
  await secure.remove(CREDENTIALS_KEY);
  kv.remove(PROFILE_KEY);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'loading',
  session: null,
  notice: null,

  hydrate: async () => {
    try {
      const raw = await secure.get(CREDENTIALS_KEY);
      const profile = kv.getJSON<Omit<Session, keyof Credentials>>(PROFILE_KEY);
      if (!raw || !profile) return set({ status: 'signedOut', session: null });
      if (isIdleExpired()) {
        await wipe();
        return set({ status: 'signedOut', session: null, notice: IDLE_NOTICE });
      }
      const creds = JSON.parse(raw) as Credentials;
      set({ status: 'signedIn', session: { ...profile, ...creds } });
    } catch {
      await wipe();
      set({ status: 'signedOut', session: null });
    }
  },

  signIn: async (s) => {
    resetIdle();
    await persist(s);
    set({ status: 'signedIn', session: s, notice: null });
  },

  update: async (s) => {
    if (get().status !== 'signedIn') return;
    await persist(s);
    set({ session: s });
  },

  signOut: async (notice = null) => {
    // Idempotent: several failing requests may report the same expiry.
    if (get().status === 'signedOut') return set({ notice: notice ?? get().notice });
    set({ status: 'signedOut', session: null, notice });
    await wipe();
  },

  clearNotice: () => set({ notice: null }),
}));

/** For screens under the auth guard only. */
export function useSession(): Session {
  const s = useSessionStore((st) => st.session);
  if (!s) throw new Error('useSession called while signed out');
  return s;
}
