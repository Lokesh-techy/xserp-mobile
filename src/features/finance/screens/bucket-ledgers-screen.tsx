/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems, formatMoney } from '@/core/utils';
import {
  edgeOf,
  ListRow,
  ModuleScreen,
  pullable,
  QueryState,
  StateView,
  Text,
  useHostRefresh,
  useScreenSearch,
  type RowEdge,
  type ScrollHost,
} from '@/ui';

import { fetchBucketLedgers } from '../api';
import { bucketFromParam, bucketLabel, sectionTitle } from '../buckets';
import { financeKeys } from '../keys';

export function BucketLedgersScreen({ param }: { param: string }) {
  const ref = bucketFromParam(param);
  if (!ref) {
    return (
      <ModuleScreen title="Ageing">
        {() => <StateView icon="help-circle-outline" title="Unknown ageing bucket" />}
      </ModuleScreen>
    );
  }
  return (
    <ModuleScreen title={`${sectionTitle(ref.receivable, ref.scope)} · ${bucketLabel(ref.bucket, ref.receivable)}`}>
      {(host) => <Body host={host} param={param} />}
    </ModuleScreen>
  );
}

function Body({ host, param }: { host: ScrollHost; param: string }) {
  const styles = useStyles();
  const ref = bucketFromParam(param)!;
  const search = useScreenSearch('Search parties');
  const query = useQuery({ queryKey: financeKeys.bucket(param), queryFn: () => fetchBucketLedgers(ref) });
  useHostRefresh(
    host,
    useCallback(() => query.refetch(), [query]),
  );
  const rows = useMemo(
    () => filterItems(query.data ?? [], search, (l) => [l.name, l.group_name]),
    [query.data, search],
  );
  return (
    <QueryState
      query={query}
      wrap={(n) => pullable(host, n)}
      isEmpty={(d) => d.length === 0}
      empty={{ icon: 'checkmark-circle-outline', title: 'Nothing in this bucket' }}>
      {() =>
        host.attach(
          <Animated.FlatList
            {...host.scrollProps}
            data={rows}
            keyExtractor={(l) => l.id}
            contentContainerStyle={styles.pad}
            initialNumToRender={15}
            windowSize={9}
            renderItem={({ item, index }) => <BucketLedgerRow item={item} edge={edgeOf(index, rows.length)} />}
          />,
        )
      }
    </QueryState>
  );
}

type LedgerRowData = Awaited<ReturnType<typeof fetchBucketLedgers>>[number];

const openLedger = (l: LedgerRowData) =>
  router.push({ pathname: '/finance/ledger/[id]', params: { id: l.id, name: l.name, group: l.group_name } });

/** Party on the left; its bucket amount, and what is overdue of it, in an aligned column on the right. */
const BucketLedgerRow = memo(function BucketLedgerRow({ item, edge }: { item: LedgerRowData; edge: RowEdge }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <ListRow edge={edge} style={styles.card} onPress={() => openLedger(item)}>
      <View style={styles.flex}>
        <Text variant="rowTitle" numberOfLines={2}>
          {item.name}
        </Text>
        {item.credit_period > 0 && (
          <Text variant="rowMeta" color={t.colors.textMuted}>
            {item.credit_period} days credit
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text variant="rowTitle" weight="bold" style={styles.num}>
          {formatMoney(item.closing_balance || item.total)}
        </Text>
        {!!item.due && (
          <Text variant="rowMeta" color={t.colors.danger} style={styles.num}>
            Due {formatMoney(item.due)}
          </Text>
        )}
      </View>
    </ListRow>
  );
});

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  num: { fontVariant: ['tabular-nums'] },
}));
