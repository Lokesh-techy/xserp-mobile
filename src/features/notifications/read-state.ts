/** @author Lokesh */
import { create } from 'zustand';

import { useSessionStore } from '@/core/auth';
import { kv } from '@/core/storage/kv';

import type { AppNotification } from './api';

// The server keeps no read flag, so read state lives on this device, per signed-in account.
const KEY = (account: string) => `notifications.read.v1:${account}`;
const MAX = 800;

/**
 * A notification's identity for "read": counter notifications ("5 POs pending") are rewritten in place under
 * the same id, so the message is part of it — a changed count shows as unread again.
 */
export function readKey(n: Pick<AppNotification, 'id' | 'message'>): string {
  let h = 5381;
  for (let i = 0; i < n.message.length; i++) h = ((h << 5) + h + n.message.charCodeAt(i)) | 0;
  return `${n.id}:${(h >>> 0).toString(36)}`;
}

type ReadState = {
  account: string | null;
  read: Set<string>;
  load: (account: string) => void;
  mark: (items: Pick<AppNotification, 'id' | 'message'>[], read: boolean) => void;
  /** Forget keys for notifications that no longer exist, so storage stays small. */
  prune: (live: Pick<AppNotification, 'id' | 'message'>[]) => void;
};

const save = (account: string | null, read: Set<string>) => {
  if (account) kv.setJSON(KEY(account), [...read].slice(-MAX));
};

export const useReadState = create<ReadState>((set, get) => ({
  account: null,
  read: new Set(),
  load: (account) => {
    if (get().account === account) return;
    set({ account, read: new Set(kv.getJSON<string[]>(KEY(account)) ?? []) });
  },
  mark: (items, read) => {
    const next = new Set(get().read);
    for (const n of items) {
      if (read) next.add(readKey(n));
      else next.delete(readKey(n));
    }
    set({ read: next });
    save(get().account, next);
  },
  prune: (live) => {
    const keep = new Set(live.map(readKey));
    const cur = get().read;
    const next = new Set([...cur].filter((k) => keep.has(k)));
    if (next.size !== cur.size) {
      set({ read: next });
      save(get().account, next);
    }
  },
}));

// Follow the signed-in account: each user (and company) has their own read state on a shared device.
const syncAccount = () => {
  const session = useSessionStore.getState().session;
  if (session) useReadState.getState().load(`${session.enterpriseId}:${session.userId}`);
};
syncAccount();
useSessionStore.subscribe(syncAccount);
