/** @author Lokesh */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';
import { Chip, ListSkeleton, QueryState, SearchField, useHostRefresh, type ScrollHost } from '@/ui';

import { ApprovalCard } from './approval-card';
import { openPager } from './pager-store';
import type { ApprovalConfig } from './types';
import { useApprovalQueue } from './use-queue';

/** A module's "Pending" tab: searchable, virtualised queue that opens the swipe pager. */
export type QueueSort<T> = { key: string; label: string; compare: (a: T, b: T) => number };

export function QueueList<T, D>({ config, host, sorts }: { config: ApprovalConfig<T, D>; host: ScrollHost; sorts?: QueueSort<T>[] }) {
  const t = useTheme();
  const styles = useStyles();
  const query = useApprovalQueue(config);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  const items = useMemo(() => {
    const found = filterItems(query.data ?? [], search, (i) => config.search?.(i) ?? [config.summary(i).code, config.summary(i).party]);
    const sort = sorts?.find((x) => x.key === sortKey);
    return sort ? [...found].sort(sort.compare) : found;
  }, [query.data, search, config, sorts, sortKey]);

  return (
    <QueryState query={query} skeleton={<View style={styles.pad}><ListSkeleton /></View>} isEmpty={(d) => d.length === 0} empty={{ icon: 'checkmark-done-outline', title: 'All caught up', message: `No ${config.title.toLowerCase()} are waiting for you.` }}>
      {() =>
        host.attach(
          <Animated.FlatList
            {...host.scrollProps}
            data={items}
            keyExtractor={config.id}
            contentContainerStyle={styles.pad}
            initialNumToRender={8}
            windowSize={7}
            ListHeaderComponent={
              <View style={styles.search}>
                <SearchField value={search} onChangeText={setSearch} placeholder={`Search ${config.title.toLowerCase()}`} />
                {!!sorts?.length && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} {...host.nestedProps}>
                    {sorts.map((s) => (
                      <Chip key={s.key} label={s.label} icon="swap-vertical-outline" active={sortKey === s.key} onPress={() => setSortKey((k) => (k === s.key ? null : s.key))} />
                    ))}
                  </ScrollView>
                )}
              </View>
            }
            renderItem={({ item }) => <ApprovalCard summary={config.summary(item)} tint={t.tints[config.tint]} onPress={() => openPager(config, items, config.id(item))} />}
          />,
        )
      }
    </QueryState>
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingBottom: 48 }, search: { marginBottom: 14, gap: 12 }, chips: { gap: 8 } }));
