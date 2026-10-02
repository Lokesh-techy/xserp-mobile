/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';
import { ListSkeleton, QueryState, ScreenHeader, toast } from '@/ui';

import { removeFromPager, usePagerStore } from './pager-store';
import { ReviewPager, type ReviewEntry } from './review-pager';
import { erase, type ApprovalConfig } from './types';
import { useApprovalQueue } from './use-queue';

/** A single module's queue (or lookup results) in the review pager. */
export function ApprovalPagerScreen<T, D>({ config }: { config: ApprovalConfig<T, D> }) {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const pager = usePagerStore();
  // Decided once: items handed over by a list (queue or lookup), or the live queue for deep links.
  const [fromStore] = useState(() => pager.type === config.type && pager.items.length > 0);
  const [initialId] = useState(() => id ?? (fromStore ? pager.startId : null));
  const queue = useApprovalQueue(config, !fromStore);
  const any = useMemo(() => erase(config), [config]);
  const items = useMemo(() => (fromStore ? (pager.items as T[]) : (queue.data ?? [])), [fromStore, pager.items, queue.data]);
  const entries = useMemo<ReviewEntry[]>(() => items.map((item) => ({ key: `${config.type}:${config.id(item)}`, config: any, item })), [items, config, any]);

  // Leaving the pager drops the hand-over so a later deep link can't reuse stale items.
  useEffect(() => () => usePagerStore.setState({ type: null, items: [], startId: null }), []);
  useEffect(() => {
    if (fromStore && items.length === 0) {
      toast.show({ message: `No more ${config.title.toLowerCase()} to review`, tone: 'success' });
      router.back();
    }
  }, [fromStore, items.length, config.title]);

  if (!fromStore && queue.status !== 'success') {
    return (
      <View style={styles.root}>
        <ScreenHeader title={config.title} />
        <View style={styles.pad}>
          <QueryState query={queue} skeleton={<ListSkeleton rows={2} />}>
            {() => null}
          </QueryState>
        </View>
      </View>
    );
  }

  return (
    <ReviewPager
      title={config.title}
      entries={entries}
      initialKey={initialId ? `${config.type}:${initialId}` : null}
      onActed={(e) => removeFromPager(e.key.slice(config.type.length + 1), config.id as (i: unknown) => string)}
      empty={{ title: 'All caught up', message: `No ${config.title.toLowerCase()} are waiting for you.` }}
    />
  );
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, pad: { padding: t.space.gutter } }));
