/** @author Lokesh */
import { useQueries } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { POLL_MS } from '@/core/query';
import { parseServerDate } from '@/core/utils';
import type { AnyApproval, ReviewEntry } from '@/features/approvals/engine';

import { APPROVALS } from './approval-registry';

const time = (e: ReviewEntry) => parseServerDate(e.config.summary(e.item).date)?.getTime() ?? 0;

/** Every pending document across modules, newest first (undated ones last). */
export function buildFeed(groups: { config: AnyApproval; items: unknown[] }[]): ReviewEntry[] {
  return groups
    .flatMap(({ config, items }) => items.map((item) => ({ key: `${config.type}:${config.id(item)}`, config, item })))
    .sort((a, b) => time(b) - time(a));
}

/** Live, polled feed of everything the signed-in user can approve. */
export function useApprovalFeed() {
  const session = useSessionStore((s) => s.session);
  const configs = useMemo(() => Object.values(APPROVALS).filter((c): c is AnyApproval => !!c && can(session, c.permission, 'approve')), [session]);
  const results = useQueries({ queries: configs.map((c) => ({ queryKey: c.queueKey, queryFn: c.queue, refetchInterval: POLL_MS })) });
  const data = results.map((r) => r.data);
  const entries = useMemo(() => buildFeed(configs.map((config, i) => ({ config, items: data[i] ?? [] }))), [configs, data]);
  const loading = results.some((r) => r.isPending);
  const refetch = useCallback(() => Promise.all(results.map((r) => r.refetch())), [results]);
  return { entries, loading, refetch, enabled: configs.length > 0 };
}
