/** @author Lokesh */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCan } from '@/core/permissions';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { filterItems, lastDays, parseServerDate } from '@/core/utils';
import { ApprovalCard, openPager, useApprovalQueue } from '@/features/approvals/engine';
import { Chip, ListSkeleton, PickerSheet, SearchField, Section, StatCard, StateView, useHostRefresh, type ScrollHost } from '@/ui';

import type { Receipt } from '../api';
import { grnApproval } from '../approvals';
import { useGrnStatus } from '../hooks';

const SORTS = {
  date: { label: 'Receipt date', fn: (a: Receipt, b: Receipt) => (parseServerDate(b.receiptDate)?.getTime() ?? 0) - (parseServerDate(a.receiptDate)?.getTime() ?? 0) },
  supplier: { label: 'Supplier', fn: (a: Receipt, b: Receipt) => a.supplierName.localeCompare(b.supplierName) },
  value: { label: 'Invoice value', fn: (a: Receipt, b: Receipt) => b.invoiceValue - a.invoiceValue },
} as const;
type SortKey = keyof typeof SORTS;

export function GrnTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const canApprove = useCan('STORES', 'approve');
  const [range] = useState(() => lastDays(30));
  const status = useGrnStatus(range);
  const queue = useApprovalQueue(grnApproval, canApprove);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');
  const [supplier, setSupplier] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const refetch = useCallback(() => Promise.all([status.refetch(), canApprove ? queue.refetch() : null]), [status, queue, canApprove]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);

  const suppliers = useMemo(() => [...new Set((queue.data ?? []).map((r) => r.supplierName))].filter(Boolean).map((s) => ({ id: s, label: s })), [queue.data]);
  const rows = useMemo(() => {
    const base = filterItems(queue.data ?? [], search, (r) => [r.code, r.supplierName, r.projectName]).filter((r) => !supplier || r.supplierName === supplier);
    return [...base].sort(SORTS[sort].fn);
  }, [queue.data, search, supplier, sort]);

  const header = (
    <View style={styles.head}>
      {status.data && (
        <Section title="Last 30 days">
          <View style={styles.grid}>
            <StatCard label="Raised" value={String(status.data.grn_raised)} icon="document-text-outline" tone="info" />
            <StatCard label="In process" value={String(status.data.grn_inprocess)} icon="sync-outline" tone="warning" />
            <StatCard label="Accounted" value={String(status.data.grn_accounted)} icon="checkmark-done-outline" tone="success" />
          </View>
        </Section>
      )}
      {canApprove && (
        <Section title="Awaiting approval">
          <SearchField value={search} onChangeText={setSearch} placeholder="Search GRN, supplier or project" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} {...host.nestedProps}>
            <Chip label={supplier ?? 'All suppliers'} icon="business-outline" active={!!supplier} onPress={() => setPicking(true)} />
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <Chip key={k} label={SORTS[k].label} icon="swap-vertical-outline" active={sort === k} onPress={() => setSort(k)} />
            ))}
          </ScrollView>
        </Section>
      )}
    </View>
  );

  return (
    <>
      {host.attach(
        <Animated.FlatList
          {...host.scrollProps}
          data={canApprove ? rows : []}
          keyExtractor={(r) => r.receiptNo}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={header}
          ListEmptyComponent={
            !canApprove ? null : queue.isPending ? <ListSkeleton rows={3} /> : <StateView icon="checkmark-done-outline" title="All caught up" message="No goods receipts are waiting for you." />
          }
          renderItem={({ item }) => <ApprovalCard summary={grnApproval.summary(item)} tint={t.tints.stores} showStatus={false} onPress={() => openPager(grnApproval, rows, item.receiptNo)} />}
        />,
      )}
      <PickerSheet visible={picking} title="Supplier" items={suppliers} selectedId={supplier} onSelect={(i) => setSupplier(i?.id ?? null)} onClose={() => setPicking(false)} />
    </>
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingTop: 0, paddingBottom: 48 }, head: { marginBottom: 14 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, chips: { gap: 8 } }));
