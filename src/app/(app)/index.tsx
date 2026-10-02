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
  const sync = useCallback(() => {
    const s = useSessionStore.getState().session;
    const queues = Object.values(APPROVALS).filter((c) => c && can(s, c.permission, 'approve'));
    return runSync([
      // Labels are shown in order while each step is still running (pull caption + sync line).
      { label: 'Checking your access…', run: refreshSession },
      {
        label: 'Fetching approvals…',
        run: () => Promise.all(queues.map((c) => qc.refetchQueries({ queryKey: c!.queueKey }))),
      },
      { label: 'Checking notifications…', run: () => qc.refetchQueries({ queryKey: ['notifications'] }) },
      ...(can(s, 'EXPENSES', 'approve')
        ? [{ label: 'Fetching expense claims…', run: () => qc.refetchQueries({ queryKey: expenseKeys.groups() }) }]
        : []),
      { label: 'Syncing parties, materials & ledgers…', run: () => syncAllMasters({ force: true }) },
    ]);
  }, [refreshSession, qc]);

  // Sync on arrival when the last full sync is stale.
  const autoSynced = useRef(false);
  const signedIn = !!session;
  useEffect(() => {
    if (autoSynced.current || !signedIn) return;
    autoSynced.current = true;
    const at = useLastSync.getState().at;
    if (!at || Date.now() - at > AUTO_SYNC_AFTER_MS) void sync();
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
  return <HomeScreen modules={modules} approvals={approvals} onRefresh={sync} />;
}
