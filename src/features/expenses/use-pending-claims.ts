/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { useCan } from '@/core/permissions';
import { usePollInterval } from '@/core/query';

import { fetchExpenseGroups } from './api';
import { expenseKeys } from './keys';

/** Confirmed claims waiting for an approver — feeds the Approvals inbox. */
export function usePendingClaims() {
  const canApprove = useCan('EXPENSES', 'approve');
  const q = useQuery({ queryKey: expenseKeys.groups(), queryFn: fetchExpenseGroups, refetchInterval: usePollInterval(), enabled: canApprove });
  return { enabled: canApprove, count: q.data?.Confirmed.length ?? 0, loading: q.isPending, refetch: q.refetch };
}
