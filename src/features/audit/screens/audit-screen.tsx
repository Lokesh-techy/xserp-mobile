/** @author Lokesh */
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { parseServerDate } from '@/core/utils';
import { ApprovalCard, QueueList, useApprovalQueue, type QueueSort } from '@/features/approvals/engine';
import type { Receipt } from '@/features/stores';
import { edgeOf, ModuleScreen, SegmentedTabs, StateView, useHostRefresh, useTabParam, type ScrollHost } from '@/ui';

import { icdApproval } from '../approvals';
import { useAuditSession } from '../session-store';

const TABS = ['pending', 'verified', 'returned'] as const;
const time = (s: string | null) => parseServerDate(s)?.getTime() ?? 0;
const SORTS: QueueSort<Receipt>[] = [
  { key: 'name', label: 'Supplier', compare: (a, b) => a.supplierName.localeCompare(b.supplierName) },
  { key: 'receipt', label: 'Receipt date', compare: (a, b) => time(b.receiptDate) - time(a.receiptDate) },
  { key: 'invoice', label: 'Invoice date', compare: (a, b) => time(b.invoiceDate) - time(a.invoiceDate) },
  { key: 'invoiceValue', label: 'Invoice amount', compare: (a, b) => b.invoiceValue - a.invoiceValue },
  { key: 'noteValue', label: 'Note amount', compare: (a, b) => b.noteValue - a.noteValue },
];

export function AuditScreen() {
  const styles = useStyles();
  const enabled = useSessionStore((s) => !!s.session?.icd.enabled);
  const [tab, setTab] = useTabParam(TABS, 'pending');
  const pending = useApprovalQueue(icdApproval, enabled);
  const done = useAuditSession();
  const tabs = [
    { key: 'pending' as const, label: 'Pending', badge: pending.data?.length },
    { key: 'verified' as const, label: 'Verified', badge: done.verified.length || undefined },
    { key: 'returned' as const, label: 'Returned', badge: done.returned.length || undefined },
  ];
  if (!enabled) {
    return (
      <ModuleScreen title="Audit">
        {() => (
          <View style={styles.pad}>
            <StateView icon="shield-outline" title="Internal control is off" message="Ask your administrator to enable ICD for this company." />
          </View>
        )}
      </ModuleScreen>
    );
  }
  return (
    <ModuleScreen title="Audit" subtitle="Internal control · GRN notes" tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}>
      {(host) => (tab === 'pending' ? <QueueList config={icdApproval} host={host} sorts={SORTS} /> : <SessionList host={host} items={tab === 'verified' ? done.verified : done.returned} kind={tab} />)}
    </ModuleScreen>
  );
}

function SessionList({ host, items, kind }: { host: ScrollHost; items: Receipt[]; kind: 'verified' | 'returned' }) {
  const t = useTheme();
  const styles = useStyles();
  useHostRefresh(host, useCallback(() => Promise.resolve(), []));
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={items}
      keyExtractor={(r, i) => `${r.receiptNo}:${i}`}
      contentContainerStyle={styles.pad}
      ListEmptyComponent={<StateView icon={kind === 'verified' ? 'shield-checkmark-outline' : 'arrow-undo-outline'} title={`Nothing ${kind} yet`} message={`GRN notes you ${kind === 'verified' ? 'verify' : 'return'} in this session appear here.`} />}
      renderItem={({ item, index }) => (
        <ApprovalCard edge={edgeOf(index, items.length)} summary={{ ...icdApproval.summary(item), status: kind === 'verified' ? { label: 'Verified', tone: 'success' } : { label: 'Returned', tone: 'danger' } }} tint={t.tints.audit} />
      )}
    />,
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingBottom: 48 } }));
