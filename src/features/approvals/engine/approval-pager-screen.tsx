/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { makeStyles } from '@/core/theme';
import { ListSkeleton, QueryState, ScreenHeader, StateView, toast } from '@/ui';

import { ActionBar } from './action-bar';
import { ApprovalPage } from './approval-page';
import { pickCurrent } from './pager-selection';
import { removeFromPager, usePagerStore } from './pager-store';
import { RemarksSheet } from './remarks-sheet';
import { visibleActions, type ApprovalAction, type ApprovalConfig } from './types';
import { useApprovalAction } from './use-approval-action';
import { useApprovalQueue } from './use-queue';

export function ApprovalPagerScreen<T, D>({ config }: { config: ApprovalConfig<T, D> }) {
  const styles = useStyles();
  const session = useSession();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const pager = usePagerStore();
  // Decided once: items handed over by a list (queue or lookup), or the live queue for deep links.
  const [fromStore] = useState(() => pager.type === config.type && pager.items.length > 0);
  const queue = useApprovalQueue(config, !fromStore);
  const items = useMemo(() => (fromStore ? (pager.items as T[]) : (queue.data ?? [])), [fromStore, pager.items, queue.data]);
  const [selectedId, setSelectedId] = useState<string | null>(() => id ?? (fromStore ? pager.startId : null));
  const [lastIndex, setLastIndex] = useState(0);
  const [picked, setPicked] = useState<ApprovalAction<T> | null>(null);
  const current = pickCurrent(items, selectedId, lastIndex, config.id);
  const item = current ? items[current.index] : undefined;
  // Remember where the selected document sits, so removing it keeps the user at that position.
  if (current && current.id === selectedId && current.index !== lastIndex) setLastIndex(current.index);
  const canAct = can(session, config.permission, 'approve');

  const { start, isBusy } = useApprovalAction(config, (doneId) => removeFromPager(doneId, config.id as (i: unknown) => string));

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

  if (!current || !item) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={config.title} />
        <View style={styles.pad}>
          <StateView icon="checkmark-done-outline" title="All caught up" message={`No ${config.title.toLowerCase()} are waiting for you.`} />
        </View>
      </View>
    );
  }

  const actions = canAct ? visibleActions(config, item, { session }) : [];
  return (
    <View style={styles.root}>
      <ScreenHeader title={config.title} subtitle={`${current.index + 1} of ${items.length}`} />
      <FlatList
        // Remount at the right page whenever the list changes size (load, approve, refresh).
        key={items.length}
        data={items}
        horizontal
        pagingEnabled
        initialScrollIndex={current.index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={config.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          const next = items[i];
          if (!next) return;
          setLastIndex(i);
          setSelectedId(config.id(next));
        }}
        renderItem={({ item: page, index: i }) => <ApprovalPage config={config} item={page} active={Math.abs(i - current.index) <= 1} width={width} />}
      />
      <ActionBar actions={actions} canAct={canAct} busy={isBusy(item)} onPick={setPicked} />
      <RemarksSheet action={picked} onClose={() => setPicked(null)} onConfirm={(remarks) => picked && start(item, picked, remarks)} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, pad: { padding: t.space.gutter } }));
