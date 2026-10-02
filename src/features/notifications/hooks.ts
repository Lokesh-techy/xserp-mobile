/** @author Lokesh */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { errorMessage } from '@/core/api';
import { useSessionStore } from '@/core/auth';
import { POLL_MS } from '@/core/query';
import { toast } from '@/ui';

import { countUnread, deleteNotifications, fetchNotifications, markRead, type AppNotification } from './api';

export const notificationKeys = { list: () => ['notifications'] as const };

export function useNotifications() {
  const signedIn = useSessionStore((s) => s.status === 'signedIn');
  return useQuery({ queryKey: notificationKeys.list(), queryFn: fetchNotifications, refetchInterval: POLL_MS, enabled: signedIn });
}

export const useUnreadCount = () => countUnread(useNotifications().data ?? []);

/** Optimistic list edit with rollback, shared by delete and mark-read. */
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

export const useDeleteNotifications = () => useListMutation(deleteNotifications, (list, ids: string[]) => list.filter((n) => !ids.includes(n.id)));
export const useMarkRead = () => useListMutation(markRead, (list, id: string) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
