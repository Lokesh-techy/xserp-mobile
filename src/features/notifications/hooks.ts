/** @author Lokesh */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { errorMessage } from '@/core/api';
import { useSessionStore } from '@/core/auth';
import { POLL_MS } from '@/core/query';
import { toast } from '@/ui';

import { countUnread, deleteNotifications, fetchNotifications, type AppNotification } from './api';
import { readKey, useReadState } from './read-state';

export const notificationKeys = { list: () => ['notifications'] as const };

// Per server object: its read key (hashed once) and its read copy (made once), so marking one notification
// read hands every other row the very same object and memoised rows skip re-rendering.
const keys = new WeakMap<AppNotification, string>();
const readCopies = new WeakMap<AppNotification, AppNotification>();
function withRead(n: AppNotification, readSet: Set<string>): AppNotification {
  if (n.read) return n;
  let key = keys.get(n);
  if (!key) keys.set(n, (key = readKey(n)));
  if (!readSet.has(key)) return n;
  let copy = readCopies.get(n);
  if (!copy) readCopies.set(n, (copy = { ...n, read: true }));
  return copy;
}

/** The list with read state applied (server flag, or marked read on this device). */
export function useNotifications() {
  const signedIn = useSessionStore((s) => s.status === 'signedIn');
  const readSet = useReadState((s) => s.read);
  // `select` re-runs only when the data or the read set changes, and keeps the query's own result type.
  const select = useCallback((list: AppNotification[]) => list.map((n) => withRead(n, readSet)), [readSet]);
  const query = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotifications,
    refetchInterval: POLL_MS,
    enabled: signedIn,
    select,
  });
  const raw = useQueryClient().getQueryData<AppNotification[]>(notificationKeys.list());
  useEffect(() => {
    if (raw) useReadState.getState().prune(raw);
  }, [raw]);
  return query;
}

export const useUnreadCount = () => countUnread(useNotifications().data ?? []);

/** Mark one, several or all as read (or unread again) — instant, kept on this device. */
export const markNotifications = (items: AppNotification[], read = true) => useReadState.getState().mark(items, read);

/** Optimistic list edit with rollback. */
function useListMutation<V>(fn: (v: V) => Promise<void>, apply: (list: AppNotification[], v: V) => AppNotification[]) {
  const qc = useQueryClient();
  const key = notificationKeys.list();
  return useMutation({
    mutationFn: fn,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AppNotification[]>(key);
      qc.setQueryData<AppNotification[]>(key, (list) => apply(list ?? [], v));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.previous);
      toast.show({ message: errorMessage(e), tone: 'danger' });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export const useDeleteNotifications = () =>
  useListMutation(deleteNotifications, (list, ids: string[]) => list.filter((n) => !ids.includes(n.id)));
