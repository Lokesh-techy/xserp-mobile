/** @author Lokesh */
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { errorMessage } from '@/core/api';
import { refreshSession, useSessionStore } from '@/core/auth';
import { errorFeedback, successFeedback } from '@/core/utils';
import { toast } from '@/ui';

import { createActionRunner } from './action-runner';
import type { ApprovalAction, ApprovalConfig } from './types';

const UNDO_MS = 4000;

export function useApprovalAction<T, D>(config: ApprovalConfig<T, D>, onSucceeded: (id: string) => void) {
  const qc = useQueryClient();
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);

  const runner = useMemo(() => {
    const settle = (key: string) => setPendingKeys((k) => k.filter((x) => x !== key));
    return createActionRunner({
      delayMs: UNDO_MS,
      onScheduled: () => undefined,
      onDone: settle,
      onError: (key, e) => {
        settle(key);
        errorFeedback();
        toast.show({ message: errorMessage(e), tone: 'danger', durationMs: 5000 });
      },
    });
  }, []);

  const start = (item: T, action: ApprovalAction<T>, remarks: string) => {
    const session = useSessionStore.getState().session;
    if (!session) return;
    const id = config.id(item);
    const key = `${config.type}:${id}:${action.id}`;
    const accepted = runner.run(
      key,
      async () => {
        await action.run(item, remarks.trim(), { session });
        successFeedback();
        toast.show({ message: `${config.noun} ${config.summary(item).code} · ${action.done}`, tone: 'success' });
        onSucceeded(id);
        await Promise.all([
          qc.invalidateQueries({ queryKey: config.queueKey }),
          ...(config.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })),
          refreshSession(session).then((s) => useSessionStore.getState().update(s)).catch(() => undefined),
        ]);
      },
      action.precheck ? () => action.precheck!(item) : undefined,
    );
    if (!accepted) return;
    setPendingKeys((k) => [...k, key]);
    toast.show({
      message: `${action.label} ${config.noun} ${config.summary(item).code}…`,
      tone: 'info',
      durationMs: UNDO_MS,
      action: { label: 'Undo', onPress: () => (runner.cancel(key), setPendingKeys((k) => k.filter((x) => x !== key))) },
    });
  };

  const isBusy = (item: T) => pendingKeys.some((k) => k.startsWith(`${config.type}:${config.id(item)}:`));
  return { start, isBusy };
}
