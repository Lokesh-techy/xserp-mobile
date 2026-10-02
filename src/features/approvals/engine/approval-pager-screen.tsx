/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { makeStyles } from '@/core/theme';
import { ScreenHeader, StateView, toast } from '@/ui';

import { ActionBar } from './action-bar';
import { ApprovalPage } from './approval-page';
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
  // Deep links / app restarts land here without pager items: fall back to the live queue.
  const fromStore = pager.type === config.type && pager.items.length > 0;
  const queue = useApprovalQueue(config, !fromStore);
  const items = useMemo(() => (fromStore ? (pager.items as T[]) : (queue.data ?? [])), [fromStore, pager.items, queue.data]);
  const startIndex = Math.max(0, items.findIndex((i) => config.id(i) === (pager.startId ?? id)));
  const [index, setIndex] = useState(startIndex);
  const [picked, setPicked] = useState<ApprovalAction<T> | null>(null);
  const list = useRef<FlatList<T>>(null);
  const current = items[Math.min(index, items.length - 1)];
  const canAct = can(session, config.permission, 'approve');

  const { start, isBusy } = useApprovalAction(config, (doneId) => removeFromPager(doneId, config.id as (i: unknown) => string));

  useEffect(() => {
    if (fromStore && items.length === 0) {
      toast.show({ message: `No more ${config.title.toLowerCase()} to review`, tone: 'success' });
      router.back();
    }
  }, [fromStore, items.length, config.title]);

  if (!current) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={config.title} />
        <View style={styles.pad}>
          <StateView icon="checkmark-done-outline" title="All caught up" message={`No ${config.title.toLowerCase()} are waiting for you.`} />
        </View>
      </View>
    );
  }

  const actions = canAct ? visibleActions(config, current, { session }) : [];
  return (
    <View style={styles.root}>
      <ScreenHeader title={config.title} subtitle={`${Math.min(index, items.length - 1) + 1} of ${items.length}`} />
      <FlatList
        ref={list}
        data={items}
        horizontal
        pagingEnabled
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={config.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => <ApprovalPage config={config} item={item} active={Math.abs(i - index) <= 1} width={width} />}
      />
      <ActionBar actions={actions} canAct={canAct} busy={isBusy(current)} onPick={setPicked} />
      <RemarksSheet action={picked} onClose={() => setPicked(null)} onConfirm={(remarks) => picked && start(current, picked, remarks)} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, pad: { padding: t.space.gutter } }));
