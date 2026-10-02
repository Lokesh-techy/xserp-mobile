/** @author Lokesh */
import { create } from 'zustand';

import { useSessionStore } from '@/core/auth';

import { createActionRunner } from './action-runner';

export const UNDO_MS = 4000;

type Ref = { type: string; id: string; action: string };
type Callbacks = { onError: (e: unknown) => void; onDone?: () => void };

// One queue for the whole app: a document with a pending action can't get a second one,
// even after the pager is closed and reopened during the undo window.
const usePending = create<{ docs: string[] }>(() => ({ docs: [] }));
const docKey = (type: string, id: string) => `${type}:${id}`;
const callbacks = new Map<string, Callbacks>();
const keys = new Set<string>();

const settle = (key: string) => {
  const doc = key.split(':').slice(0, 2).join(':');
  callbacks.delete(key);
  keys.delete(key);
  usePending.setState((s) => ({ docs: s.docs.filter((d) => d !== doc) }));
};

const runner = createActionRunner({
  delayMs: UNDO_MS,
  onScheduled: () => undefined,
  onDone: (key) => {
    callbacks.get(key)?.onDone?.();
    settle(key);
  },
  onError: (key, e) => {
    callbacks.get(key)?.onError(e);
    settle(key);
  },
});

export function scheduleApprovalAction(
  ref: Ref,
  task: () => Promise<void>,
  cb: Callbacks & { precheck?: () => Promise<void> },
): boolean {
  const doc = docKey(ref.type, ref.id);
  if (usePending.getState().docs.includes(doc)) return false;
  const key = `${doc}:${ref.action}`;
  callbacks.set(key, cb);
  if (!runner.run(key, task, cb.precheck)) return false;
  keys.add(key);
  usePending.setState((s) => ({ docs: [...s.docs, doc] }));
  return true;
}

export function cancelApprovalAction(ref: Ref) {
  const key = `${docKey(ref.type, ref.id)}:${ref.action}`;
  runner.cancel(key);
  keys.delete(key);
  settle(key);
}

export function cancelAllApprovalActions() {
  for (const key of [...keys]) {
    runner.cancel(key);
    settle(key);
  }
  keys.clear();
}

export const isActionPending = (type: string, id: string) => usePending.getState().docs.includes(docKey(type, id));
export const usePendingDocs = () => usePending((s) => s.docs);

useSessionStore.subscribe((s, prev) => {
  if (prev.status === 'signedIn' && s.status === 'signedOut') cancelAllApprovalActions();
});
