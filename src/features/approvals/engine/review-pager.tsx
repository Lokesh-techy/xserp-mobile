/** @author Lokesh */
import { useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { makeStyles } from '@/core/theme';
import { ScreenHeader, StateView } from '@/ui';

import { ActionBar } from './action-bar';
import { ApprovalPage } from './approval-page';
import { pickCurrent } from './pager-selection';
import { RemarksSheet } from './remarks-sheet';
import { visibleActions, type AnyApproval, type ApprovalAction } from './types';
import { useApprovalActions } from './use-approval-action';

export type ReviewEntry = { key: string; config: AnyApproval; item: unknown };
export const entryKey = (config: AnyApproval, item: unknown) => `${config.type}:${config.id(item)}`;

type Props = { title: string; entries: ReviewEntry[]; initialKey: string | null; onActed?: (entry: ReviewEntry) => void; empty?: { title: string; message: string } };

/**
 * One document at a time, swipe for the next. Entries may mix approval types (the Home review)
 * or come from one queue (a module's pager). The document acted on is always the one on screen.
 */
export function ReviewPager({ title, entries, initialKey, onActed, empty }: Props) {
  const styles = useStyles();
  const session = useSession();
  const { width } = useWindowDimensions();
  const [selectedKey, setSelectedKey] = useState<string | null>(initialKey);
  const [lastIndex, setLastIndex] = useState(0);
  const [picked, setPicked] = useState<ApprovalAction<unknown> | null>(null);
  const current = pickCurrent(entries, selectedKey, lastIndex, (e) => e.key);
  const entry = current ? entries[current.index] : undefined;
  if (current && current.id === selectedKey && current.index !== lastIndex) setLastIndex(current.index);
  const { start, isBusy } = useApprovalActions((config, id) => onActed?.({ key: `${config.type}:${id}`, config, item: null }));

  if (!current || !entry) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={title} />
        <View style={styles.pad}>
          <StateView icon="checkmark-done-outline" title={empty?.title ?? 'All caught up'} message={empty?.message ?? 'Nothing is waiting for you.'} />
        </View>
      </View>
    );
  }

  const canAct = can(session, entry.config.permission, 'approve');
  const actions = canAct ? visibleActions(entry.config, entry.item, { session }) : [];
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} subtitle={`${current.index + 1} of ${entries.length} · ${entry.config.title}`} />
      <FlatList
        // Remount at the right page whenever the list changes size (load, approve, refresh).
        key={entries.length}
        data={entries}
        horizontal
        pagingEnabled
        initialScrollIndex={current.index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(e) => e.key}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          const next = entries[i];
          if (!next) return;
          setLastIndex(i);
          setSelectedKey(next.key);
        }}
        renderItem={({ item: e, index: i }) => <ApprovalPage config={e.config} item={e.item} active={Math.abs(i - current.index) <= 1} width={width} />}
      />
      <ActionBar
        actions={actions}
        canAct={canAct}
        busy={isBusy(entry.config, entry.item)}
        onPick={setPicked}
        onHold={(a) => start(entry.config, entry.item, a, '')}
      />
      <RemarksSheet action={picked} onClose={() => setPicked(null)} onConfirm={(remarks) => picked && start(entry.config, entry.item, picked, remarks)} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, pad: { padding: t.space.gutter } }));
