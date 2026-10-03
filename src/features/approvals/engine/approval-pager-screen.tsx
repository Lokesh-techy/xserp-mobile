/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';
import { ListSkeleton, QueryState, ScreenHeader, toast } from '@/ui';

import { clearHandover, peekHandover } from './pager-store';
import { ReviewPager, toEntries, type ReviewEntry } from './review-pager';
import { erase, type ApprovalConfig } from './types';
import { useApprovalQueue } from './use-queue';

/** A single module's queue (or lookup results) in the review pager. */
export function ApprovalPagerScreen<T, D>({ config }: { config: ApprovalConfig<T, D> }) {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // Decided once: items handed over by a list (queue or lookup), or the live queue for deep links.
  // The pager keeps its own copy, so nothing outside it (a screen rebuilt after the app was in the
  // background, another pager closing) can empty it and make it think the work is done.
  const [handover] = useState(() => peekHandover(config.type));
  const fromStore = handover !== null;
  const [own, setOwn] = useState(() => (handover?.items ?? []) as T[]);
  const [acted, setActed] = useState(false);
  const [initialId] = useState(() => id ?? handover?.startId ?? null);
  const queue = useApprovalQueue(config, !fromStore);
  const any = useMemo(() => erase(config), [config]);
  const items = useMemo(() => (fromStore ? own : (queue.data ?? [])), [fromStore, own, queue.data]);
  const entries = useMemo<ReviewEntry[]>(() => toEntries(any, items), [items, any]);

  useEffect(() => {
    if (fromStore) clearHandover();
  }, [fromStore]);
  // Only the user's own approvals can finish the batch.
  useEffect(() => {
    if (fromStore && acted && items.length === 0) {
      toast.show({ message: `No more ${config.title.toLowerCase()} to review`, tone: 'success' });
      router.back();
    }
  }, [fromStore, acted, items.length, config.title]);

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
      onActed={(e) => {
        const actedId = e.key.slice(config.type.length + 1);
        setActed(true);
        setOwn((list) => list.filter((i) => config.id(i) !== actedId));
      }}
      empty={{ title: 'All caught up', message: `No ${config.title.toLowerCase()} are waiting for you.` }}
    />
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  pad: { padding: t.space.gutter },
}));
