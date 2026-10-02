/** @author Lokesh */
import { formatDistanceStrict } from 'date-fns';
import { create } from 'zustand';

import { kv } from '@/core/storage/kv';

const KEY = 'xserp.lastSync';
export const AUTO_SYNC_AFTER_MS = 30 * 60_000;

type State = { at: number | null; syncing: boolean; failed: boolean };

/** When everything (session, masters, queues, notifications) was last refreshed together. */
export const useLastSync = create<State>(() => ({ at: Number(kv.getString(KEY)) || null, syncing: false, failed: false }));

let inFlight: Promise<void> | null = null;

/** Runs every sync task together; concurrent calls share the run in progress. */
export function runSync(tasks: (() => Promise<unknown>)[]): Promise<void> {
  if (inFlight) return inFlight;
  useLastSync.setState({ syncing: true });
  inFlight = Promise.allSettled(tasks.map((task) => task())).then((results) => {
    const ok = results.every((r) => r.status === 'fulfilled');
    const at = ok ? Date.now() : useLastSync.getState().at;
    if (ok) kv.setString(KEY, String(at));
    useLastSync.setState({ syncing: false, failed: !ok, at });
    inFlight = null;
  });
  return inFlight;
}

export function syncLabel(at: number | null, syncing: boolean, now = Date.now()): string {
  if (syncing) return 'Syncing…';
  if (!at) return 'Not synced yet';
  if (now - at < 60_000) return 'Synced just now';
  return `Synced ${formatDistanceStrict(at, now)} ago`;
}
