/** @author Lokesh */
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';
import { syncMaster, useMasterStore, type MasterKind } from '@/features/master-data';
import {
  edgeOf,
  ItemText,
  ListRow,
  StateView,
  Text,
  TrailingTag,
  useHostRefresh,
  useScreenSearch,
  type PickerItem,
  type ScrollHost,
} from '@/ui';

type Props = {
  host: ScrollHost;
  kind: MasterKind;
  items: PickerItem[];
  noun: string;
  onOpen: (item: PickerItem) => void;
};

/** Searchable, virtualised list over a cached master; pull to force a re-sync. */
export function MasterList({ host, kind, items, noun, onOpen }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const syncedAt = useMasterStore((s) => s.syncedAt[kind]);
  const syncing = useMasterStore((s) => s.syncing[kind]);
  const search = useScreenSearch(`Search ${noun}`);
  useHostRefresh(
    host,
    useCallback(() => syncMaster(kind, { force: true }), [kind]),
  );
  const rows = useMemo(() => filterItems(items, search, (i) => [i.label, i.sublabel, i.trailing]), [items, search]);
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={rows}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.pad}
      initialNumToRender={15}
      windowSize={9}
      ListHeaderComponent={
        <View style={styles.head}>
          <Text variant="caption" color={t.colors.textMuted}>
            {rows.length} {noun} ·{' '}
            {syncing
              ? 'syncing…'
              : syncedAt
                ? `synced ${formatDistanceToNow(syncedAt, { addSuffix: true })}`
                : 'not synced yet'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <StateView
          icon="albums-outline"
          title={syncing ? `Syncing ${noun}…` : `No ${noun}`}
          message={syncing ? undefined : 'Pull down to sync.'}
        />
      }
      renderItem={({ item, index }) => (
        <ListRow edge={edgeOf(index, rows.length)} style={styles.card} onPress={() => onOpen(item)}>
          <ItemText item={item} />
          <TrailingTag value={item.trailing} />
        </ListRow>
      )}
    />,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  head: { gap: 8, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
}));
