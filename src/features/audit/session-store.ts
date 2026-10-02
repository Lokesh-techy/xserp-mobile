/** @author Lokesh */
import { create } from 'zustand';

import { useSessionStore } from '@/core/auth';
import type { Receipt } from '@/features/stores';

type State = { verified: Receipt[]; returned: Receipt[] };

/** GRN notes actioned in this app session (XSManager kept the Approved/Returned tabs in memory too). */
export const useAuditSession = create<State>(() => ({ verified: [], returned: [] }));

export const recordAudit = (kind: keyof State, r: Receipt) => useAuditSession.setState((s) => ({ [kind]: [r, ...s[kind].filter((x) => x.receiptNo !== r.receiptNo)] }));

useSessionStore.subscribe((s, prev) => {
  if (prev.status === 'signedIn' && s.status === 'signedOut') useAuditSession.setState({ verified: [], returned: [] });
});
