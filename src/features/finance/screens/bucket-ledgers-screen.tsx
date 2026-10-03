/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
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
  type ScrollHost,
} from '@/ui';

import { fetchBucketLedgers } from '../api';
import { bucketFromParam } from '../buckets';
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
    <ModuleScreen title={`${ref.receivable ? 'Receivable' : 'Payable'} · ${ref.bucket.label}`}>
      {(host) => <Body host={host} param={param} />}
    </ModuleScreen>
  );
}

function Body({ host, param }: { host: ScrollHost; param: string }) {
  const t = useTheme();
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
            renderItem={({ item, index }) => (
              <ListRow
                edge={edgeOf(index, rows.length)}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/finance/ledger/[id]',
                    params: { id: item.id, name: item.name, group: item.group_name },
                  })
                }>
                <View style={styles.flex}>
                  <Text variant="rowTitle">{item.name}</Text>
                  <Text variant="rowMeta" color={t.colors.textMuted}>
                    {item.group_name}
                    {item.credit_period ? ` · ${item.credit_period} days credit` : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="rowTitle" weight="bold">
                    {formatMoney(item.closing_balance || item.total)}
                  </Text>
                  {!!item.due && (
                    <Text variant="rowMeta" color={t.colors.danger}>
                      Due {formatMoney(item.due)}
                    </Text>
                  )}
                </View>
              </ListRow>
            )}
          />,
        )
      }
    </QueryState>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
}));
