/** @author Lokesh */
import { useQueries } from '@tanstack/react-query';
import type { Href } from 'expo-router';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { POLL_MS } from '@/core/query';
import { erase, type AnyApproval, type ApprovalType } from '@/features/approvals/engine';
import { poApproval } from '@/features/purchase';
import { invoiceApproval, oaApproval } from '@/features/sales';
import { grnApproval } from '@/features/stores';

// Each module task adds its config here, e.g. `po: erase(poApproval)`.
export const APPROVALS: Partial<Record<ApprovalType, AnyApproval>> = { po: erase(poApproval), invoice: erase(invoiceApproval), oa: erase(oaApproval), grn: erase(grnApproval) };

const HREF: Record<ApprovalType, Href> = {
  po: '/purchase?tab=pending',
  invoice: '/sales?tab=pendingInvoices',
  oa: '/sales?tab=pendingOa',
  grn: '/stores?tab=grn',
  icd: '/audit?tab=pending',
  rate: '/masters?tab=rates',
};

export function useInboxEntries() {
  const session = useSessionStore((s) => s.session);
  const configs = Object.values(APPROVALS).filter((c): c is AnyApproval => !!c && can(session, c.permission, 'approve'));
  const results = useQueries({ queries: configs.map((c) => ({ queryKey: c.queueKey, queryFn: c.queue, refetchInterval: POLL_MS })) });
  return configs.map((config, i) => ({ config, href: HREF[config.type], count: results[i]?.data?.length ?? 0, loading: results[i]?.isPending ?? true, refetch: () => results[i]?.refetch() }));
}

export function useApprovalsTotal(): number {
  return useInboxEntries().reduce((n, e) => n + e.count, 0);
}
