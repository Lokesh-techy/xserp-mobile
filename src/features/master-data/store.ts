/** @author Lokesh */
import { create } from 'zustand';

import { errorMessage } from '@/core/api';
import { useSessionStore } from '@/core/auth';
import { env } from '@/core/config/env';
import { kv } from '@/core/storage/kv';

import { masterFetchers, type MasterKind, type MasterRows } from './api';

export const MASTER_KINDS: MasterKind[] = ['parties', 'materials', 'ledgers', 'projects', 'taxes'];
export const MASTER_LABELS: Record<MasterKind, string> = { parties: 'Parties', materials: 'Materials', ledgers: 'Ledgers', projects: 'Projects', taxes: 'Taxes' };
export const STALE_AFTER_MS = 12 * 60 * 60_000;

type State = {
  data: MasterRows;
  syncedAt: Record<MasterKind, number | null>;
  syncing: Record<MasterKind, boolean>;
  error: Record<MasterKind, string | null>;
};

const per = <V>(v: V) => Object.fromEntries(MASTER_KINDS.map((k) => [k, v])) as Record<MasterKind, V>;
const empty = (): State => ({ data: { parties: [], materials: [], ledgers: [], projects: [], taxes: [] }, syncedAt: per(null), syncing: per(false), error: per(null) });

// Scoped by server + enterprise so switching accounts never shows another company's masters.
const scope = () => `${env.serverUrl}|${useSessionStore.getState().session?.enterpriseId ?? 'none'}`;
const key = (kind: MasterKind) => `xserp.master.${kind}.${scope()}`;

export const useMasterStore = create<State>(() => empty());

// Bumped on every sign-in/sign-out so in-flight syncs from a previous session are ignored.
let generation = 0;

function load() {
  const next = empty();
  for (const kind of MASTER_KINDS) {
    const saved = kv.getJSON<{ rows: MasterRows[MasterKind]; at: number }>(key(kind));
    if (saved) {
      (next.data as Record<MasterKind, unknown>)[kind] = saved.rows;
      next.syncedAt[kind] = saved.at;
    }
  }
  useMasterStore.setState(next);
}

export async function syncMaster(kind: MasterKind, { force = false } = {}) {
  const st = useMasterStore.getState();
  const at = st.syncedAt[kind];
  if (st.syncing[kind] || (!force && at && Date.now() - at < STALE_AFTER_MS)) return;
  useMasterStore.setState((s) => ({ syncing: { ...s.syncing, [kind]: true } }));
  // Captured before the (slow) download: if the user switches company meanwhile, the result is dropped.
  const started = generation;
  const storageKey = key(kind);
  try {
    const rows = await masterFetchers[kind]();
    if (started !== generation) return;
    const now = Date.now();
    kv.setJSON(storageKey, { rows, at: now });
    useMasterStore.setState((s) => ({ data: { ...s.data, [kind]: rows }, syncedAt: { ...s.syncedAt, [kind]: now }, error: { ...s.error, [kind]: null } }));
  } catch (e) {
    if (started === generation) useMasterStore.setState((s) => ({ error: { ...s.error, [kind]: errorMessage(e) } }));
  } finally {
    if (started === generation) useMasterStore.setState((s) => ({ syncing: { ...s.syncing, [kind]: false } }));
  }
}

export const syncAllMasters = (opts: { force?: boolean } = {}) => Promise.all(MASTER_KINDS.map((k) => syncMaster(k, opts))).then(() => undefined);

// Follow the session: load the right company's cache on sign-in, wipe it on sign-out.
useSessionStore.subscribe((s, prev) => {
  if (s.status !== prev.status) generation += 1;
  if (s.status === 'signedIn' && prev.status !== 'signedIn') load();
  if (s.status === 'signedOut' && prev.status === 'signedIn') {
    const enterprise = prev.session?.enterpriseId;
    for (const kind of MASTER_KINDS) kv.remove(`xserp.master.${kind}.${env.serverUrl}|${enterprise}`);
    useMasterStore.setState(empty());
  }
});
if (useSessionStore.getState().status === 'signedIn') load();
