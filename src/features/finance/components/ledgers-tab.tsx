/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, toneColors, useTheme } from '@/core/theme';
import { filterItems, formatMoney, parseServerDate } from '@/core/utils';
import { syncMaster, useLedgers, useMasterStore } from '@/features/master-data';
import {
  HeaderRight,
  ListRow,
  MenuButton,
  rowEdge,
  StateView,
  Text,
  useHostRefresh,
  useScreenSearch,
  type RowEdge,
  type ScrollHost,
} from '@/ui';

import { fetchLedgerBalances } from '../api';
import { financeKeys } from '../keys';
import {
  drCr,
  groupCounts,
  groupLedgers,
  type LedgerItem,
  type LedgerListRow,
  type LedgerSort,
} from '../ledger-groups';

const ALL = '__all__';
const SORTS = [
  { key: 'name', label: 'Name' },
  { key: 'balance', label: 'Balance' },
];

/**
 * Ledgers by account group with their balances. Names come from the on-device master straight away; balances
 * (the server's cached ledger_balance table) fill in when they arrive.
 */
export function LedgersTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const names = useLedgers();
  const syncing = useMasterStore((s) => s.syncing.ledgers);
  const balances = useQuery({
    queryKey: financeKeys.ledgerBalances(),
    queryFn: fetchLedgerBalances,
    staleTime: 10 * 60_000,
  });
  const [group, setGroup] = useState(ALL);
  const [sort, setSort] = useState<LedgerSort>('name');
  const search = useScreenSearch('Search ledgers');
  useHostRefresh(
    host,
    useCallback(() => Promise.all([syncMaster('ledgers', { force: true }), balances.refetch()]), [balances]),
  );

  const items = useMemo<LedgerItem[]>(() => {
    if (balances.data) {
      return balances.data.ledgers.map((l) => ({
        id: l.id,
        name: l.name,
        group: l.group_name,
        partyCode: l.party_code ?? null,
        balance: l.balance,
      }));
    }
    return names.map((l) => ({ id: l.id, name: l.name, group: l.group, partyCode: null, balance: null }));
  }, [balances.data, names]);
  const groups = useMemo(() => groupCounts(items), [items]);
  const { rows, sticky } = useMemo(() => {
    const scoped = group === ALL ? items : items.filter((l) => (l.group || 'Ungrouped') === group);
    const list = groupLedgers(
      filterItems(scoped, search, (l) => [l.name, l.group, l.partyCode]),
      sort,
    );
    const headers: number[] = [];
    // +1: with a ListHeaderComponent, FlatList counts the header as row 0 of stickyHeaderIndices.
    list.forEach((r, i) => r.kind === 'header' && headers.push(i + 1));
    return { rows: list, sticky: headers };
  }, [items, group, search, sort]);
  const count = rows.length - sticky.length; // rows minus group headers
  const at = parseServerDate(balances.data?.computed_on);

  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={rows}
      keyExtractor={(r: LedgerListRow) => r.key}
      stickyHeaderIndices={sticky}
      contentContainerStyle={styles.pad}
      initialNumToRender={18}
      windowSize={9}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          <HeaderRight>
            <View style={styles.controls}>
              <MenuButton
                title="Account group"
                icon="folder-open-outline"
                options={[
                  { key: ALL, label: 'All groups', detail: String(items.length) },
                  ...groups.map((g) => ({ key: g.group, label: g.group, detail: String(g.count) })),
                ]}
                value={group}
                onChange={setGroup}
              />
              <MenuButton
                title="Sort by"
                icon="swap-vertical-outline"
                options={SORTS}
                value={sort}
                onChange={(k) => setSort(k as LedgerSort)}
              />
            </View>
          </HeaderRight>
          <Text variant="caption" color={t.colors.textFaint} style={styles.summary}>
            {count.toLocaleString('en-IN')} ledgers ·{' '}
            {balances.isPending
              ? 'loading balances…'
              : balances.isError
                ? 'balances unavailable'
                : at
                  ? `balances as of ${formatDistanceToNow(at, { addSuffix: true })}`
                  : 'balances'}
          </Text>
        </>
      }
      ListEmptyComponent={
        <StateView
          icon="book-outline"
          title={syncing ? 'Syncing ledgers…' : search || group !== ALL ? 'No matches' : 'No ledgers'}
          message={syncing ? undefined : 'Pull down to sync the ledger list.'}
        />
      }
      renderItem={({ item: row }: { item: LedgerListRow }) =>
        row.kind === 'header' ? (
          <GroupHeader group={row.group} count={row.count} total={row.total} />
        ) : (
          <LedgerRow item={row.item} edge={rowEdge(row.first, row.last)} />
        )
      }
    />,
  );
}

function Balance({ value, strong }: { value: number; strong?: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const { amount, side } = drCr(value);
  return (
    <Text
      variant={strong ? 'rowTitle' : 'caption'}
      weight={strong ? 'bold' : undefined}
      style={styles.num}
      color={strong ? t.colors.text : t.colors.textMuted}>
      {formatMoney(amount)}
      {side && (
        <Text variant="caption" color={side === 'Dr' ? toneColors(t, 'info').fg : t.colors.success}>
          {` ${side}`}
        </Text>
      )}
    </Text>
  );
}

function GroupHeader({ group, count, total }: { group: string; count: number; total: number | null }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="label" color={t.colors.text} numberOfLines={1} style={styles.flex}>
        {group}
        <Text variant="caption" color={t.colors.textFaint}>{`  ${count}`}</Text>
      </Text>
      {total !== null && <Balance value={total} />}
    </View>
  );
}

const openLedger = (l: LedgerItem) =>
  router.push({ pathname: '/finance/ledger/[id]', params: { id: l.id, name: l.name, group: l.group } });

/** Name (and party code) on the left; the balance with its Dr/Cr side in an aligned column on the right. */
const LedgerRow = memo(function LedgerRow({ item, edge }: { item: LedgerItem; edge: RowEdge }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <ListRow edge={edge} style={styles.row} onPress={() => openLedger(item)}>
      <View style={styles.flex}>
        <Text variant="rowTitle" numberOfLines={2}>
          {item.name}
        </Text>
        {!!item.partyCode && (
          <Text variant="rowMeta" color={t.colors.textMuted} numberOfLines={1}>
            {item.partyCode}
          </Text>
        )}
      </View>
      {item.balance !== null && <Balance value={item.balance} strong />}
    </ListRow>
  );
});

const useStyles = makeStyles((t) => ({
  pad: { paddingHorizontal: t.space.gutter, paddingTop: 4, paddingBottom: 48 },
  controls: { flexDirection: 'row', gap: 8 },
  summary: { paddingHorizontal: 4, paddingTop: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: t.colors.bg,
  },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  num: { fontVariant: ['tabular-nums'] },
}));
