/** @author Lokesh */
import { useQueryClient } from '@tanstack/react-query';

import { errorMessage } from '@/core/api';
import { refreshSession, useSessionStore } from '@/core/auth';
import { errorFeedback, successFeedback } from '@/core/utils';
import { toast } from '@/ui';

import { cancelApprovalAction, scheduleApprovalAction, UNDO_MS, usePendingDocs } from './action-queue';
import type { ApprovalAction, ApprovalConfig } from './types';

/** Starts an approve/reject through the app-wide action queue (undo window, one action per document). */
export function useApprovalAction<T, D>(config: ApprovalConfig<T, D>, onSucceeded: (id: string) => void) {
  const qc = useQueryClient();
  const pending = usePendingDocs();

  const start = (item: T, action: ApprovalAction<T>, remarks: string) => {
    const session = useSessionStore.getState().session;
    if (!session) return;
    const id = config.id(item);
    const ref = { type: config.type, id, action: action.id };
    const code = config.summary(item).code;
    const accepted = scheduleApprovalAction(
      ref,
      async () => {
        await action.run(item, remarks.trim(), { session });
        successFeedback();
        toast.show({ message: `${config.noun} ${code} · ${action.done}`, tone: 'success' });
        onSucceeded(id);
        await Promise.all([
          qc.invalidateQueries({ queryKey: config.queueKey }),
          ...(config.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })),
          refreshSession(session)
            .then((s) => useSessionStore.getState().update(s))
            .catch(() => undefined),
        ]);
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
      return;
    }
    toast.show({ message: `${action.label} ${config.noun} ${code}…`, tone: 'info', durationMs: UNDO_MS, action: { label: 'Undo', onPress: () => cancelApprovalAction(ref) } });
  };

  const isBusy = (item: T) => pending.includes(`${config.type}:${config.id(item)}`);
  return { start, isBusy };
}
