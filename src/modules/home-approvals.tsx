/** @author Lokesh */
import { router } from 'expo-router';

import { approvalTints } from '@/core/theme';
import { usePendingClaims } from '@/features/expenses';
import { ApprovalsCard, serializeTypes, useLastSync } from '@/features/home';

import { summarizeByType, useApprovalFeed } from './approval-feed';

/** Home's approvals section: subscribes to the approval queues itself, so only it re-renders when they change. */
export function HomeApprovals() {
  const feed = useApprovalFeed();
  const claims = usePendingClaims();
  const syncing = useLastSync((s) => s.syncing);
  if (!feed.enabled && !claims.enabled) return null;
  const groups = [
    ...summarizeByType(feed.entries).map((g) => ({ key: g.type, label: g.label, tint: approvalTints[g.type], count: g.count })),
    ...(claims.enabled && claims.count > 0 ? [{ key: 'expenses', label: 'Claims', tint: approvalTints.expenses, count: claims.count, direct: () => router.push('/expenses?tab=confirmed') }] : []),
  ];
  return (
    <ApprovalsCard
      groups={groups}
      loading={feed.loading}
      syncing={syncing}
      onReview={(types) => router.push({ pathname: '/approvals/review', params: types.length ? { types: serializeTypes(types) } : {} })}
    />
  );
}
