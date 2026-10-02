/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { POLL_MS } from '@/core/query';

import type { ApprovalConfig } from './types';

/** The pending queue for one approval type; polls while the app is open. */
export function useApprovalQueue<T, D>(config: ApprovalConfig<T, D>, enabled = true) {
  const allowed = useSessionStore((s) => can(s.session, config.permission, 'view'));
  return useQuery({ queryKey: config.queueKey, queryFn: config.queue, refetchInterval: POLL_MS, enabled: enabled && allowed });
}
