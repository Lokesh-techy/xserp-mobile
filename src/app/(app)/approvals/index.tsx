/** @author Lokesh */
import { useCallback } from 'react';

import { InboxScreen } from '@/features/approvals';
import { useInboxEntries } from '@/modules/approval-registry';

export default function Approvals() {
  const entries = useInboxEntries();
  const refresh = useCallback(() => Promise.all(entries.map((e) => e.refetch())), [entries]);
  return (
    <InboxScreen
      entries={entries.map((e) => ({ key: e.config.type, title: e.config.title, icon: 'document-text-outline', tint: e.config.tint, count: e.count, loading: e.loading, href: e.href }))}
      onRefresh={refresh}
    />
  );
}
