/** @author Lokesh */
import { formatDistanceStrict } from 'date-fns';
import { create } from 'zustand';

import { kv } from '@/core/storage/kv';

const KEY = 'xserp.lastSync';
export const AUTO_SYNC_AFTER_MS = 30 * 60_000;

type State = { at: number | null; syncing: boolean; failed: boolean; step: string | null };

/** A sync step; a label lets the UI say what is actually happening. */
export type SyncTask = (() => Promise<unknown>) | { label: string; run: () => Promise<unknown> };

/** When everything (session, masters, queues, notifications) was last refreshed together. */
export const useLastSync = create<State>(() => ({ at: Number(kv.getString(KEY)) || null, syncing: false, failed: false, step: null }));

let inFlight: Promise<void> | null = null;

/** Runs every sync task together; concurrent calls share the run in progress. */
export function runSync(tasks: SyncTask[]): Promise<void> {
  if (inFlight) return inFlight;
  const steps = tasks.map((t) => (typeof t === 'function' ? { label: null, run: t } : t));
  const done = steps.map(() => false);
  // The step shown is the first one (in order) that hasn't finished yet.
  const current = () => steps.find((s, i) => !done[i] && s.label)?.label ?? null;
  useLastSync.setState({ syncing: true, step: current() });
  const running = steps.map((s, i) =>
    s.run().finally(() => {
      done[i] = true;
      if (inFlight) useLastSync.setState({ step: current() });
    }),
  );
  inFlight = Promise.allSettled(running).then((results) => {
    const ok = results.every((r) => r.status === 'fulfilled');
    const at = ok ? Date.now() : useLastSync.getState().at;
    if (ok) kv.setString(KEY, String(at));
    useLastSync.setState({ syncing: false, failed: !ok, at, step: null });
    inFlight = null;
  });
  return inFlight;
}

export function syncLabel(at: number | null, syncing: boolean, now = Date.now(), step: string | null = null): string {
  if (syncing) return step ?? 'Reaching the server…';
  if (!at) return 'Not synced yet';
  if (now - at < 60_000) return 'Synced just now';
  return `Synced ${formatDistanceStrict(at, now)} ago`;
}
