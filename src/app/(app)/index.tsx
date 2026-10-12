/** @author Lokesh */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { useSessionRefreshAction } from '@/features/auth';
import { expenseKeys } from '@/features/expenses';
import { AUTO_SYNC_AFTER_MS, HomeScreen, runSync, useLastSync } from '@/features/home';
import { syncAllMasters } from '@/features/master-data';
import { APPROVALS } from '@/modules/approval-registry';
import { HomeApprovals } from '@/modules/home-approvals';
import { HOME_MODULES, moduleAccess, moduleBadge } from '@/modules/registry';

/**
 * Home route: layout data that rarely changes (modules, permissions) plus the sync action.
 * Frequently changing data lives in the components that display it.
 */
export default function Home() {
  const qc = useQueryClient();
  const session = useSessionStore((s) => s.session);
  const refreshSession = useSessionRefreshAction();

  // One pull syncs everything. Queries are refetched by key, so this screen holds none of them.
  // A pull refetches every queue; the automatic sync only fills in what is stale. Neither cancels a request
  // already running (it is joined instead), and masters keep their own 12 h rule — the Masters screen forces them.
  const sync = useCallback(
    (manual: boolean) => {
      const s = useSessionStore.getState().session;
      const queues = Object.values(APPROVALS).filter((c) => c && can(s, c.permission, 'approve'));
      const refetch = (queryKey: readonly unknown[]) => qc.refetchQueries({ queryKey, stale: manual ? undefined : true }, { cancelRefetch: false });
      return runSync([
        // Labels are shown in order while each step is still running (pull caption + sync line).
        { label: 'Checking your access…', run: () => refreshSession({ force: manual }) },
        { label: 'Fetching approvals…', run: () => Promise.all(queues.map((c) => refetch(c!.queueKey))) },
        { label: 'Checking notifications…', run: () => refetch(['notifications']) },
        ...(can(s, 'EXPENSES', 'approve') ? [{ label: 'Fetching expense claims…', run: () => refetch(expenseKeys.groups()) }] : []),
        { label: 'Syncing parties, materials & ledgers…', run: () => syncAllMasters() },
      ]);
    },
    [refreshSession, qc],
  );
  const pullSync = useCallback(() => sync(true), [sync]);

  // Sync on arrival when the last full sync is stale.
  const autoSynced = useRef(false);
  const signedIn = !!session;
  useEffect(() => {
    if (autoSynced.current || !signedIn) return;
    autoSynced.current = true;
    const at = useLastSync.getState().at;
    if (!at || Date.now() - at > AUTO_SYNC_AFTER_MS) void sync(false);
  }, [signedIn, sync]);

  const modules = useMemo(
    () =>
      session
        ? HOME_MODULES.map((m) => ({
            id: m.id,
            title: m.title,
            subtitle: m.subtitle,
            icon: m.icon,
            tint: m.tint,
            href: m.href,
            access: moduleAccess(m, session),
            badge: moduleBadge(m, session),
          }))
        : [],
    [session],
  );
  const approvals = useMemo(() => <HomeApprovals />, []);

  if (!session) return null;
  return <HomeScreen modules={modules} approvals={approvals} onRefresh={pullSync} />;
}
