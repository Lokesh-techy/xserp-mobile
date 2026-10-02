/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems, formatMoney } from '@/core/utils';
import { Card, ModuleScreen, QueryState, SearchField, StateView, Text, useHostRefresh, type ScrollHost, pullable } from '@/ui';

import { fetchBucketLedgers } from '../api';
import { bucketFromParam } from '../buckets';
import { financeKeys } from '../keys';

export function BucketLedgersScreen({ param }: { param: string }) {
  const ref = bucketFromParam(param);
  if (!ref) {
    return <ModuleScreen title="Ageing">{() => <StateView icon="help-circle-outline" title="Unknown ageing bucket" />}</ModuleScreen>;
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
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: financeKeys.bucket(param), queryFn: () => fetchBucketLedgers(ref) });
  useHostRefresh(host, useCallback(() => query.refetch(), [query]));
  const rows = useMemo(() => filterItems(query.data ?? [], search, (l) => [l.name, l.group_name]), [query.data, search]);
  return (
    <QueryState query={query} wrap={(n) => pullable(host, n)} isEmpty={(d) => d.length === 0} empty={{ icon: 'checkmark-circle-outline', title: 'Nothing in this bucket' }}>
      {() =>
        host.attach(
          <Animated.FlatList
            {...host.scrollProps}
            data={rows}
            keyExtractor={(l) => l.id}
            contentContainerStyle={styles.pad}
            ListHeaderComponent={
              <View style={styles.head}>
                <SearchField value={search} onChangeText={setSearch} placeholder="Search parties" />
              </View>
            }
            renderItem={({ item }) => (
              <Card style={styles.card} onPress={() => router.push({ pathname: '/finance/ledger/[id]', params: { id: item.id, name: item.name, group: item.group_name } })}>
                <View style={styles.flex}>
                  <Text variant="label">{item.name}</Text>
                  <Text variant="caption" color={t.colors.textMuted}>
                    {item.group_name}
                    {item.credit_period ? ` · ${item.credit_period} days credit` : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="label" weight="bold">
                    {formatMoney(item.closing_balance || item.total)}
                  </Text>
                  {!!item.due && (
                    <Text variant="caption" color={t.colors.danger}>
                      Due {formatMoney(item.due)}
                    </Text>
                  )}
                </View>
              </Card>
            )}
          />,
        )
      }
    </QueryState>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  head: { marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 14 },
  flex: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
}));
