/** @author Lokesh */
import { router } from 'expo-router';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import type { PermissionCode } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, parseServerDate, tapFeedback } from '@/core/utils';
import {
  edgeOf,
  ModuleScreen,
  pullable,
  QueryState,
  SegmentedControl,
  StateView,
  Text,
  useHostRefresh,
  type RowEdge,
  type ScrollHost,
} from '@/ui';

import { countUnread, dayTitle, groupRuns, type AppNotification } from '../api';
import { NotificationRow } from '../components/notification-row';
import { SelectionBar } from '../components/selection-bar';
import { markNotifications, useDeleteNotifications, useNotifications } from '../hooks';
import { notificationAction, type NotificationAction } from '../intent';

// Who may act on each review queue a notification can open.
const QUEUE_PERMISSION: Record<string, PermissionCode> = {
  po: 'PURCHASE',
  invoice: 'SALES',
  oa: 'SALES',
  grn: 'STORES',
  icd: 'ICD',
  rate: 'MASTERS',
};

type Filter = 'all' | 'unread';
type ItemRow = {
  kind: 'item';
  item: AppNotification;
  edge: RowEdge;
  action: NotificationAction | null;
  time: string;
};
type Row = { kind: 'header'; title: string } | ItemRow;

export function NotificationsScreen() {
  const query = useNotifications();
  const remove = useDeleteNotifications();
  const all = useMemo(() => query.data ?? [], [query.data]);
  const unread = useMemo(() => countUnread(all), [all]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => (filter === 'unread' ? all.filter((n) => !n.read) : all), [all, filter]);

  const stopSelecting = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);
  const toggle = useCallback((id: string) => {
    tapFeedback();
    setSelecting(true);
    setSelected((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);
  const removeOne = useCallback((n: AppNotification) => remove.mutate([n.id]), [remove]);

  const picked = useMemo(() => all.filter((n) => selected.has(n.id)), [all, selected]);
  const deleteMany = (items: AppNotification[]) =>
    Alert.alert(
      items.length === 1 ? 'Delete this notification?' : `Delete ${items.length} notifications?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            remove.mutate(items.map((n) => n.id));
            stopSelecting();
          },
        },
      ],
    );

  const actions = selecting
    ? [{ icon: 'close' as const, label: 'Done', onPress: stopSelecting }]
    : [
        ...(unread > 0
          ? [{ icon: 'checkmark-done-outline' as const, label: 'Mark all read', onPress: () => markNotifications(all) }]
          : []),
        ...(all.length > 0
          ? [{ icon: 'checkbox-outline' as const, label: 'Select', onPress: () => setSelecting(true) }]
          : []),
      ];

  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        title={selecting ? (selected.size ? `${selected.size} selected` : 'Select') : 'Notifications'}
        subtitle={selecting ? 'Tap to select' : unread ? `${unread} unread` : 'All read'}
        actions={actions}>
        {(host) => (
          <Body
            host={host}
            query={query}
            all={all}
            filter={filter}
            unread={unread}
            onFilter={setFilter}
            selecting={selecting}
            selected={selected}
            onSelect={toggle}
            onDelete={removeOne}
          />
        )}
      </ModuleScreen>
      {selecting && (
        <SelectionBar
          count={selected.size}
          allSelected={visible.length > 0 && visible.every((n) => selected.has(n.id))}
          canMarkRead={picked.some((n) => !n.read)}
          onSelectAll={(on) => setSelected(new Set(on ? visible.map((n) => n.id) : []))}
          onMarkRead={() => {
            markNotifications(
              picked,
              picked.some((n) => !n.read),
            );
            stopSelecting();
          }}
          onDelete={() => deleteMany(picked)}
        />
      )}
    </View>
  );
}

type BodyProps = {
  host: ScrollHost;
  query: ReturnType<typeof useNotifications>;
  all: AppNotification[];
  filter: Filter;
  unread: number;
  onFilter: (f: Filter) => void;
  selecting: boolean;
  selected: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onDelete: (n: AppNotification) => void;
};

function Body({ host, query, all, filter, unread, onFilter, selecting, selected, onSelect, onDelete }: BodyProps) {
  const styles = useStyles();
  const session = useSessionStore((s) => s.session);
  const { refetch } = query;
  useHostRefresh(
    host,
    useCallback(() => refetch(), [refetch]),
  );
  const canReview = useCallback(
    (type: string) => !!session && !!QUEUE_PERMISSION[type] && can(session, QUEUE_PERMISSION[type], 'approve'),
    [session],
  );
  // Everything a row shows is worked out once per notification and cached; switching All/Unread only filters.
  const prepared = useMemo(() => all.map((n) => prepare(n, canReview)), [all, canReview]);
  // The switch moves at once; the list follows a moment later without blocking it.
  const shown = useDeferredValue(filter);
  const list = useMemo<Row[]>(() => {
    const items = shown === 'unread' ? prepared.filter((p) => !p.item.read) : prepared;
    return groupRuns(items, (p) => p.day).flatMap((g) => [
      { kind: 'header' as const, title: g.title },
      ...g.data.map((p, i) => ({ ...p, kind: 'item' as const, edge: edgeOf(i, g.data.length) })),
    ]);
  }, [prepared, shown]);

  // Stable handlers so memoised rows don't re-render on every change (entering/leaving selection re-renders them anyway).
  const onPress = useCallback(
    (n: AppNotification) => (selecting ? onSelect(n.id) : !n.read && markNotifications([n])),
    [selecting, onSelect],
  );
  const onLongPress = useCallback((n: AppNotification) => onSelect(n.id), [onSelect]);
  const onAction = useCallback((n: AppNotification, a: NotificationAction) => {
    markNotifications([n]);
    router.push(a.href);
  }, []);
  const onToggleRead = useCallback((n: AppNotification) => markNotifications([n], !n.read), []);

  const renderItem = useCallback(
    ({ item: r }: { item: Row }) =>
      r.kind === 'header' ? (
        <SectionTitle title={r.title} />
      ) : (
        <NotificationRow
          item={r.item}
          edge={r.edge}
          action={r.action}
          time={r.time}
          selecting={selecting}
          selected={selected.has(r.item.id)}
          onPress={onPress}
          onLongPress={onLongPress}
          onAction={onAction}
          onToggleRead={onToggleRead}
          onDelete={onDelete}
        />
      ),
    [selecting, selected, onPress, onLongPress, onAction, onToggleRead, onDelete],
  );

  const header = useMemo(
    () => (
      <SegmentedControl
        options={[
          { key: 'all', label: 'All' },
          { key: 'unread', label: unread ? `Unread · ${unread}` : 'Unread' },
        ]}
        value={filter}
        onChange={onFilter}
      />
    ),
    [unread, filter, onFilter],
  );

  return (
    <QueryState
      query={query}
      wrap={(n) => pullable(host, n)}
      isEmpty={(d) => d.length === 0}
      empty={{ icon: 'notifications-off-outline', title: 'No notifications', message: "You're all caught up." }}>
      {() =>
        host.attach(
          <Animated.FlatList
            {...host.scrollProps}
            data={list}
            keyExtractor={keyOf}
            contentContainerStyle={[styles.pad, selecting && styles.padSelecting]}
            ListHeaderComponent={header}
            ListEmptyComponent={EMPTY}
            renderItem={renderItem}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={40}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
          />,
        )
      }
    </QueryState>
  );
}

// Keyed by id (not position) so rows are reused, not rebuilt, when the filter changes.
const keyOf = (r: Row) => (r.kind === 'header' ? `h-${r.title}` : r.item.id);

// Per notification object: its heading, time text and action. Objects are reused across refreshes and
// read-state changes, so this runs once per notification, not once per render.
const preparedCache = new WeakMap<AppNotification, { day: string; time: string; action: NotificationAction | null }>();
function prepare(item: AppNotification, canReview: (type: string) => boolean) {
  let p = preparedCache.get(item);
  if (!p) {
    const d = parseServerDate(item.createdOn);
    p = {
      day: dayTitle(d),
      time: d ? formatDate(d, 'HH:mm · d MMM') : '',
      action: notificationAction(item.message, canReview),
    };
    preparedCache.set(item, p);
  }
  return { item, ...p };
}
const EMPTY = <StateView icon="mail-open-outline" title="Nothing unread" message="Everything here has been read." />;

const SectionTitle = memo(function SectionTitle({ title }: { title: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Text variant="label" color={t.colors.textMuted} style={styles.section}>
      {title}
    </Text>
  );
});

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  padSelecting: { paddingBottom: 140 },
  section: { marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
}));
