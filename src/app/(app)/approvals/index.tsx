/** @author Lokesh */
import { useCallback } from 'react';

import { InboxScreen, type InboxEntry } from '@/features/approvals';
import { usePendingClaims } from '@/features/expenses';
import { useInboxEntries } from '@/modules/approval-registry';

const ICONS = { po: 'cart-outline', invoice: 'receipt-outline', oa: 'document-text-outline', grn: 'archive-outline', icd: 'shield-checkmark-outline', rate: 'pricetag-outline' } as const;

export default function Approvals() {
  const entries = useInboxEntries();
  const claims = usePendingClaims();
  const refresh = useCallback(() => Promise.all([...entries.map((e) => e.refetch()), claims.enabled ? claims.refetch() : null]), [entries, claims]);
  const rows: InboxEntry[] = entries.map((e) => ({ key: e.config.type, title: e.config.title, icon: ICONS[e.config.type], tint: e.config.tint, count: e.count, loading: e.loading, href: e.href }));
  if (claims.enabled) rows.push({ key: 'expenses', title: 'Expense claims', icon: 'wallet-outline', tint: 'expenses', count: claims.count, loading: claims.loading, href: '/expenses?tab=confirmed' });
  return <InboxScreen entries={rows} onRefresh={refresh} />;
}
