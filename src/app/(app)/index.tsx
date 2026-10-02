/** @author Lokesh */
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSessionStore } from '@/core/auth';
import { approvalTints } from '@/core/theme';
import { useSessionRefreshAction } from '@/features/auth';
import { usePendingClaims } from '@/features/expenses';
import { AUTO_SYNC_AFTER_MS, HomeScreen, runSync, syncLabel, useLastSync } from '@/features/home';
import { syncAllMasters } from '@/features/master-data';
import { useUnreadCount } from '@/features/notifications';
import { summarizeByType, useApprovalFeed } from '@/modules/approval-feed';
import { HOME_MODULES, moduleAccess, moduleBadge } from '@/modules/registry';

/** Re-render once a minute so "Synced 5 minutes ago" stays true. */
function useMinuteTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function Home() {
  const qc = useQueryClient();
  const session = useSessionStore((s) => s.session);
  const refreshSession = useSessionRefreshAction();
  const unread = useUnreadCount();
  const feed = useApprovalFeed();
  const claims = usePendingClaims();
  const last = useLastSync();
  const now = useMinuteTick();

  // One pull syncs everything: permissions/counts, master lists, approval queues and notifications.
  const sync = useCallback(
    () =>
      runSync([
        refreshSession,
        () => syncAllMasters({ force: true }),
        feed.refetch,
        () => qc.invalidateQueries({ queryKey: ['notifications'] }),
        ...(claims.enabled ? [claims.refetch] : []),
      ]),
    [refreshSession, feed.refetch, qc, claims.enabled, claims.refetch],
  );

  // Sync on arrival when the last full sync is stale.
  const autoSynced = useRef(false);
  const signedIn = !!session;
  useEffect(() => {
    if (autoSynced.current || !signedIn) return;
    autoSynced.current = true;
    const at = useLastSync.getState().at;
    if (!at || Date.now() - at > AUTO_SYNC_AFTER_MS) void sync();
  }, [signedIn, sync]);

  if (!session) return null;
  const modules = HOME_MODULES.map((m) => ({ id: m.id, title: m.title, subtitle: m.subtitle, icon: m.icon, tint: m.tint, href: m.href, access: moduleAccess(m, session), badge: moduleBadge(m, session) }));
  const groups = [
    ...summarizeByType(feed.entries).map((g) => ({ key: g.type, label: g.label, tint: approvalTints[g.type], count: g.count })),
    ...(claims.enabled && claims.count > 0 ? [{ key: 'expenses', label: 'Claims', tint: approvalTints.expenses, count: claims.count }] : []),
  ];

  return (
    <HomeScreen
      modules={modules}
      unread={unread}
      sync={{ text: syncLabel(last.at, last.syncing, now), syncing: last.syncing }}
      onRefresh={sync}
      approvals={{
        show: feed.enabled || claims.enabled,
        groups,
        loading: feed.loading,
        onReview: (key) => {
          if (key === 'expenses') router.push('/expenses?tab=confirmed');
          else router.push({ pathname: '/approvals/review', params: key ? { type: key } : {} });
        },
      }}
    />
  );
}
