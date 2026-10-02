/** @author Lokesh */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { approvalTints, makeStyles } from '@/core/theme';
import { filterItems } from '@/core/utils';
import { ListSkeleton, ModuleScreen, SearchField, StateView, useHostRefresh, type ScrollHost } from '@/ui';

import { ApprovalCard } from './approval-card';
import type { ReviewEntry } from './review-pager';

type Props = {
  title: string;
  entries: ReviewEntry[];
  loading: boolean;
  /** Under the header, e.g. the document-type filter. */
  accessory?: ReactNode;
  onOpen: (entry: ReviewEntry) => void;
  onRefresh: () => Promise<unknown>;
};

/** The review queue as a list: scan, search, then open one to see its detail and act. */
export function ReviewList(props: Props) {
  return (
    <ModuleScreen title={props.title} subtitle={props.loading ? 'Loading…' : `${props.entries.length} waiting`} tabs={props.accessory}>
      {(host) => <Body host={host} {...props} />}
    </ModuleScreen>
  );
}

function Body({ host, entries, loading, onOpen, onRefresh }: Props & { host: ScrollHost }) {
  const styles = useStyles();
  const [query, setQuery] = useState('');
  useHostRefresh(host, useCallback(() => onRefresh(), [onRefresh]));
  const rows = useMemo(
    () =>
      filterItems(entries, query, (e) => {
        const s = e.config.summary(e.item);
        return [s.code, s.party, e.config.noun, ...(e.config.search?.(e.item) ?? [])];
      }),
    [entries, query],
  );
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={rows}
      keyExtractor={(e) => e.key}
      contentContainerStyle={styles.pad}
      initialNumToRender={10}
      windowSize={9}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.head}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search code, party or type" />
        </View>
      }
      ListEmptyComponent={loading ? <ListSkeleton rows={4} /> : <StateView icon="checkmark-done-outline" title={query ? 'No matches' : 'All clear'} message={query ? 'Try a different search.' : 'Nothing left in this selection.'} />}
      // Everything here is pending, and the stripe colour says the document type — no labels needed.
      renderItem={({ item }) => <ApprovalCard summary={item.config.summary(item.item)} tint={approvalTints[item.config.type]} showStatus={false} onPress={() => onOpen(item)} />}
    />,
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingBottom: 48 }, head: { marginBottom: 14 } }));
