/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { Alert, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate } from '@/core/utils';
import { ModuleScreen, PressableScale, QueryState, Text, useHostRefresh, type ScrollHost, pullable } from '@/ui';

import { groupByDay, type AppNotification } from '../api';
import { useDeleteNotifications, useMarkRead, useNotifications } from '../hooks';

export function NotificationsScreen() {
  const query = useNotifications();
  const remove = useDeleteNotifications();
  const all = query.data ?? [];
  const clearAll = () =>
    Alert.alert('Delete all notifications?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: () => remove.mutate(all.map((n) => n.id)) },
    ]);
  return (
    <ModuleScreen title="Notifications" actions={all.length ? [{ icon: 'trash-outline', label: 'Delete all', onPress: clearAll }] : []}>
      {(host) => <Body host={host} />}
    </ModuleScreen>
  );
}

type Row = { kind: 'header'; title: string } | { kind: 'item'; item: AppNotification };

function Body({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const query = useNotifications();
  const remove = useDeleteNotifications();
  const read = useMarkRead();
  useHostRefresh(host, useCallback(() => query.refetch(), [query]));
  const rows = useMemo<Row[]>(() => groupByDay(query.data ?? []).flatMap((g) => [{ kind: 'header' as const, title: g.title }, ...g.data.map((item) => ({ kind: 'item' as const, item }))]), [query.data]);
  return (
    <QueryState query={query} wrap={(n) => pullable(host, n)} isEmpty={(d) => d.length === 0} empty={{ icon: 'notifications-off-outline', title: 'No notifications', message: "You're all caught up." }}>
      {() =>
        host.attach(
          <Animated.FlatList
            {...host.scrollProps}
            data={rows}
            keyExtractor={(r) => (r.kind === 'header' ? `h-${r.title}` : r.item.id)}
            contentContainerStyle={styles.pad}
            renderItem={({ item: r }) =>
              r.kind === 'header' ? <SectionTitle title={r.title} /> : <NotificationRow item={r.item} onOpen={() => !r.item.read && read.mutate(r.item.id)} onDelete={() => remove.mutate([r.item.id])} />
            }
          />,
        )
      }
    </QueryState>
  );
}

function SectionTitle({ title }: { title: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Text variant="overline" color={t.colors.textMuted} style={styles.section}>
      {title}
    </Text>
  );
}

function NotificationRow({ item, onOpen, onDelete }: { item: AppNotification; onOpen: () => void; onDelete: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={60}
      onSwipeableOpen={onDelete}
      renderRightActions={() => (
        <View style={styles.delete}>
          <Ionicons name="trash-outline" size={20} color={t.colors.white} />
        </View>
      )}>
      <PressableScale onPress={onOpen} style={styles.row} scaleTo={0.99}>
        <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : t.colors.accent }]} />
        <View style={styles.flex}>
          <Text variant="rowTitle" weight={item.read ? 'medium' : 'semibold'}>
            {item.message}
          </Text>
          <Text variant="rowMeta" color={t.colors.textMuted}>
            {formatDate(item.createdOn, 'HH:mm · d MMM')}
          </Text>
        </View>
      </PressableScale>
    </ReanimatedSwipeable>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  section: { marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 10, borderRadius: t.radius.md, backgroundColor: t.colors.surface, ...t.shadow.card },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  flex: { flex: 1, gap: 4 },
  delete: { width: 80, marginBottom: 8, borderRadius: t.radius.md, backgroundColor: t.colors.danger, alignItems: 'center', justifyContent: 'center' },
}));
