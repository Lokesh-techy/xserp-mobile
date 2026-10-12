/** @author Lokesh */
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { errorMessage } from '@/core/api';
import { syncSession, useSessionStore } from '@/core/auth';
import { errorFeedback, successFeedback } from '@/core/utils';
import { toast } from '@/ui';

import { cancelApprovalAction, scheduleApprovalAction, UNDO_MS, usePendingDocs } from './action-queue';
import type { AnyApproval, ApprovalAction } from './types';

/** Quiet time after the last approve/reject before queues and counts are re-read once for the whole run. */
export const REFRESH_SETTLE_MS = 1500;

const staleKeys = new Map<string, readonly unknown[]>();
let flush: { timer: ReturnType<typeof setTimeout> | null; done: Promise<void>; resolve: () => void } | null = null;

/**
 * Marks these queries for a refresh that runs once actions stop arriving, so approving ten documents in a row
 * costs one refetch per queue and one session read rather than ten. Resolves when that refresh has finished.
 */
export function refreshAfterActions(qc: QueryClient, keys: (readonly unknown[])[]): Promise<void> {
  for (const k of keys) staleKeys.set(JSON.stringify(k), k);
  if (!flush) {
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    flush = { timer: null, done, resolve };
  }
  const current = flush;
  if (current.timer) clearTimeout(current.timer);
  current.timer = setTimeout(() => {
    flush = null;
    const batch = [...staleKeys.values()];
    staleKeys.clear();
    void Promise.allSettled([
      ...batch.map((queryKey) => qc.invalidateQueries({ queryKey })),
      syncSession({ force: true }),
    ]).then(() => current.resolve());
  }, REFRESH_SETTLE_MS);
  return current.done;
}

/** Starts approve/reject on any approval type through the app-wide action queue (undo window, one action per document). */
export function useApprovalActions(onSucceeded?: (config: AnyApproval, id: string) => void) {
  const qc = useQueryClient();
  const pending = usePendingDocs();

  /**
   * `quiet`: the caller shows its own countdown (a timer button), so no "Undo" toast. Returns whether the
   * action was scheduled.
   */
  const start = (
    config: AnyApproval,
    item: unknown,
    action: ApprovalAction<unknown>,
    remarks: string,
    { quiet = false }: { quiet?: boolean } = {},
  ): boolean => {
    const session = useSessionStore.getState().session;
    if (!session) return false;
    const id = config.id(item);
    const ref = { type: config.type, id, action: action.id };
    const code = config.summary(item).code;
    const accepted = scheduleApprovalAction(
      ref,
      async () => {
        await action.run(item, remarks.trim(), { session });
        successFeedback();
        toast.show({ message: `${config.noun} ${code} · ${action.done}`, tone: 'success' });
        onSucceeded?.(config, id);
        await refreshAfterActions(qc, [config.queueKey, ...(config.invalidate ?? [])]);
      },
      {
        precheck: action.precheck ? () => action.precheck!(item) : undefined,
        onError: (e) => {
          errorFeedback();
          toast.show({ message: errorMessage(e), tone: 'danger', durationMs: 5000 });
        },
      },
    );
    if (!accepted) {
      toast.show({ message: `${config.noun} ${code} already has an action in progress.`, tone: 'info' });
      return false;
    }
    if (quiet) return true;
    toast.show({
      message: `${action.label} ${config.noun} ${code}…`,
      tone: 'info',
      durationMs: UNDO_MS,
      action: { label: 'Undo', onPress: () => cancelApprovalAction(ref) },
    });
    return true;
  };

  /** Cancels a scheduled action while it is still in its countdown. */
  const cancel = (config: AnyApproval, item: unknown, action: ApprovalAction<unknown>) =>
    cancelApprovalAction({ type: config.type, id: config.id(item), action: action.id });

  const isBusy = (config: AnyApproval, item: unknown) => pending.includes(`${config.type}:${config.id(item)}`);
  return { start, cancel, isBusy };
}
