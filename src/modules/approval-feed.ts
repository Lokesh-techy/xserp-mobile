/** @author Lokesh */
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { POLL_MS } from '@/core/query';
import { parseServerDate } from '@/core/utils';
import type { ModuleTint } from '@/core/theme';
import type { AnyApproval, ApprovalType, ReviewEntry } from '@/features/approvals/engine';

import { APPROVALS } from './approval-registry';

/** Every pending document across modules, newest first (undated ones last). Each date is parsed once. */
export function buildFeed(groups: { config: AnyApproval; items: unknown[] }[]): ReviewEntry[] {
  const keyed = groups.flatMap(({ config, items }) =>
    items.map((item) => ({ entry: { key: `${config.type}:${config.id(item)}`, config, item }, at: parseServerDate(config.summary(item).date)?.getTime() ?? 0 })),
  );
  keyed.sort((a, b) => b.at - a.at);
  return keyed.map((k) => k.entry);
}

export type TypeSummary = { type: ApprovalType; label: string; tint: ModuleTint; count: number };

/** Display order for document types: fixed, so the Home card never reshuffles on refresh. */
export const TYPE_ORDER: ApprovalType[] = ['po', 'invoice', 'oa', 'grn', 'icd', 'rate'];

/** Pending counts per document type, in TYPE_ORDER — drives the Home approvals card. */
export function summarizeByType(entries: ReviewEntry[]): TypeSummary[] {
  const byType = new Map<ApprovalType, TypeSummary>();
  for (const e of entries) {
    const cur = byType.get(e.config.type);
    if (cur) cur.count += 1;
    else byType.set(e.config.type, { type: e.config.type, label: e.config.short ?? e.config.noun, tint: e.config.tint, count: 1 });
  }
  return [...byType.values()].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
}

/** Live, polled feed of everything the signed-in user can approve (recomputed only when a queue changes). */
export function useApprovalFeed() {
  const session = useSessionStore((s) => s.session);
  const configs = useMemo(() => Object.values(APPROVALS).filter((c): c is AnyApproval => !!c && can(session, c.permission, 'approve')), [session]);
  // `combine` is memoised by TanStack while its inputs are unchanged, so re-renders don't rebuild the feed.
  const combine = useCallback(
    (results: { data?: unknown[]; isPending: boolean }[]) => ({
      entries: buildFeed(configs.map((config, i) => ({ config, items: results[i]?.data ?? [] }))),
      loading: results.some((r) => r.isPending),
    }),
    [configs],
  );
  const feed = useQueries({ queries: configs.map((c) => ({ queryKey: c.queueKey, queryFn: c.queue, refetchInterval: POLL_MS })), combine });
  const qc = useQueryClient();
  const refetch = useCallback(() => Promise.all(configs.map((c) => qc.refetchQueries({ queryKey: c.queueKey }))), [configs, qc]);
  return { entries: feed.entries, loading: feed.loading, refetch, enabled: configs.length > 0 };
}
