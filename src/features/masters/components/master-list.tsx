/** @author Lokesh */
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';
import { syncMaster, useMasterStore, type MasterKind } from '@/features/master-data';
import { HeaderRight, StateView, Text, useHostRefresh, useScreenSearch, type RowEdge, type ScrollHost } from '@/ui';

import { flatRows, groupByLetter, headerIndices, type LetterRow } from '../group-by-letter';

type Props<T> = {
  host: ScrollHost;
  kind: MasterKind;
  /** Already narrowed by any filter; search applies on top. */
  items: T[];
  /** Size of the whole master, for "120 of 3 400" when a filter is on. */
  total: number;
  noun: string;
  nameOf: (item: T) => string;
  keyOf: (item: T) => string;
  searchOf: (item: T) => (string | null | undefined)[];
  renderRow: (item: T, edge: RowEdge) => ReactElement;
  /** A single control beside the tabs (e.g. the stock filter). */
  control?: ReactNode;
};

/** A cached master as A–Z sections with sticky letters; searching flattens it to one result panel. Pull to re-sync. */
export function MasterList<T>({
  host,
  kind,
  items,
  total,
  noun,
  nameOf,
  keyOf,
  searchOf,
  renderRow,
  control,
}: Props<T>) {
  const t = useTheme();
  const styles = useStyles();
  const syncedAt = useMasterStore((s) => s.syncedAt[kind]);
  const syncing = useMasterStore((s) => s.syncing[kind]);
  const search = useScreenSearch(`Search ${noun}`);
  useHostRefresh(
    host,
    useCallback(() => syncMaster(kind, { force: true }), [kind]),
  );
  const searching = !!search.trim();
  const { rows, sticky, count } = useMemo(() => {
    const hits = filterItems(items, search, searchOf);
    const list = searching ? flatRows(hits, keyOf) : groupByLetter(hits, nameOf, keyOf);
    // +1: the list has a ListHeaderComponent, which FlatList counts as row 0 of stickyHeaderIndices.
    return { rows: list, sticky: searching ? undefined : headerIndices(list).map((i) => i + 1), count: hits.length };
  }, [items, search, searching, searchOf, nameOf, keyOf]);
  const narrowed = count !== total;
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={rows}
      keyExtractor={(r: LetterRow<T>) => r.key}
      stickyHeaderIndices={sticky}
      contentContainerStyle={styles.pad}
      initialNumToRender={15}
      windowSize={9}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {control != null && <HeaderRight>{control}</HeaderRight>}
          <View style={styles.summary}>
            <Text variant="caption" color={t.colors.textFaint}>
              {narrowed
                ? `${count.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}`
                : count.toLocaleString('en-IN')}{' '}
              {noun} ·{' '}
              {syncing
                ? 'syncing…'
                : syncedAt
                  ? `synced ${formatDistanceToNow(syncedAt, { addSuffix: true })}`
                  : 'not synced yet'}
            </Text>
          </View>
        </>
      }
      ListEmptyComponent={
        <StateView
          icon="albums-outline"
          title={syncing ? `Syncing ${noun}…` : searching || narrowed ? 'No matches' : `No ${noun}`}
          message={
            syncing ? undefined : searching || narrowed ? 'Try a different search or filter.' : 'Pull down to sync.'
          }
        />
      }
      renderItem={({ item: row }: { item: LetterRow<T> }) =>
        row.kind === 'header' ? <LetterHeader label={row.label} count={row.count} /> : renderRow(row.item, row)
      }
    />,
  );
}

/** Same look as the review list's group headers, on the page colour so it can stick. */
function LetterHeader({ label, count }: { label: string; count: number }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="label" color={t.colors.text}>
        {label}
      </Text>
      <Text variant="caption" color={t.colors.textFaint} style={styles.num}>
        {count}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { paddingHorizontal: t.space.gutter, paddingTop: 4, paddingBottom: 48 },
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
  num: { fontVariant: ['tabular-nums'] },
}));
