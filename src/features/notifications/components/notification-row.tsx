/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { memo, useRef, useState } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, useTheme } from '@/core/theme';
import { commitFeedback, tapFeedback } from '@/core/utils';
import { ListRow, PressableScale, Text, type IconName, type RowEdge } from '@/ui';

import type { AppNotification } from '../api';
import type { NotificationAction } from '../intent';

const SWIPE_AT = 72; // drag past this and letting go commits

type Props = {
  item: AppNotification;
  edge: RowEdge;
  action: NotificationAction | null;
  /** Pre-formatted once per data change, not per render. */
  time: string;
  selecting: boolean;
  selected: boolean;
  // Stable handlers that take the item, so a row re-renders only when its own props change.
  onPress: (n: AppNotification) => void;
  onLongPress: (n: AppNotification) => void;
  onAction: (n: AppNotification, a: NotificationAction) => void;
  onToggleRead: (n: AppNotification) => void;
  onDelete: (n: AppNotification) => void;
};

/**
 * One notification. Swipe right to mark read/unread, left to delete; long-press to start selecting.
 * When the message points at work (e.g. "5 POs pending"), a button takes you straight there.
 */
export const NotificationRow = memo(function NotificationRow({
  item,
  edge,
  action,
  time,
  selecting,
  selected,
  onPress,
  onLongPress,
  onAction,
  onToggleRead,
  onDelete,
}: Props) {
  const t = useTheme();
  const styles = useStyles();
  const swipe = useRef<SwipeableMethods>(null);
  // Trays (and their animations) exist only while this row is being swiped, not for every row on screen.
  const [trays, setTrays] = useState(false);
  const height = useSharedValue(0);
  const gone = useSharedValue(0);
  const collapse = useAnimatedStyle(() =>
    gone.get() === 0
      ? {}
      : {
          height: height.get() * (1 - gone.get()),
          opacity: 1 - gone.get(),
          transform: [{ translateX: -gone.get() * 40 }],
        },
  );
  const commit = (direction: SwipeDirection) => {
    commitFeedback();
    // Dragging right (revealing the left tray) toggles read; dragging left deletes.
    if (direction === SwipeDirection.RIGHT) {
      onToggleRead(item);
      swipe.current?.close();
      return;
    }
    gone.set(
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(onDelete, item);
      }),
    );
  };
  return (
    <Animated.View
      style={[styles.clip, collapse]}
      onLayout={(e) => gone.get() === 0 && height.set(e.nativeEvent.layout.height)}>
      <ReanimatedSwipeable
        ref={swipe}
        enabled={!selecting}
        friction={1.6}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={SWIPE_AT}
        rightThreshold={SWIPE_AT}
        dragOffsetFromLeftEdge={12}
        dragOffsetFromRightEdge={12}
        onSwipeableWillOpen={commit}
        onSwipeableOpenStartDrag={() => setTrays(true)}
        onSwipeableClose={() => setTrays(false)}
        renderLeftActions={(_p, drag) => (
          <Tray
            live={trays}
            drag={drag}
            side="left"
            edge={edge}
            color={t.colors.primary}
            icon={item.read ? 'mail-unread' : 'mail-open'}
            label={item.read ? 'Unread' : 'Read'}
          />
        )}
        renderRightActions={(_p, drag) => (
          <Tray live={trays} drag={drag} side="right" edge={edge} color={t.colors.danger} icon="trash" label="Delete" />
        )}>
        <ListRow
          edge={edge}
          onPress={() => onPress(item)}
          onLongPress={() => onLongPress(item)}
          dividerInset={40}
          style={[styles.row, selected && styles.rowSelected]}
          accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.message}`}>
          <View style={styles.lead}>
            {selecting ? (
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={selected ? t.colors.primary : t.colors.textFaint}
              />
            ) : (
              <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : t.colors.accent }]} />
            )}
          </View>
          <View style={styles.flex}>
            <Text
              variant="rowTitle"
              weight={item.read ? 'medium' : 'semibold'}
              color={item.read ? t.colors.textMuted : t.colors.text}>
              {item.message}
            </Text>
            <View style={styles.foot}>
              <Text variant="caption" color={t.colors.textFaint} style={styles.flex}>
                {time}
              </Text>
              {action && !selecting && (
                <PressableScale
                  onPress={() => onAction(item, action)}
                  scaleTo={0.94}
                  style={[styles.action, action.kind === 'review' && styles.actionStrong]}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}>
                  <Text
                    variant="caption"
                    weight="bold"
                    color={action.kind === 'review' ? t.colors.white : t.colors.onPrimarySoft}>
                    {action.label}
                  </Text>
                </PressableScale>
              )}
            </View>
          </View>
        </ListRow>
      </ReanimatedSwipeable>
    </Animated.View>
  );
});

/** The coloured tray revealed by a swipe. Its box is always there (so the swipe can measure it); the animated
 * icon — the only costly part — mounts once the row is actually being dragged. */
function Tray({
  live,
  drag,
  side,
  edge,
  color,
  icon,
  label,
}: {
  live: boolean;
  drag: SharedValue<number>;
  side: 'left' | 'right';
  edge: RowEdge;
  color: string;
  icon: IconName;
  label: string;
}) {
  const styles = useStyles();
  const corners =
    side === 'left'
      ? [edge.first && styles.trayTL, edge.last && styles.trayBL]
      : [edge.first && styles.trayTR, edge.last && styles.trayBR];
  return (
    <View style={[styles.tray, { backgroundColor: color }, corners, edge.last && styles.trayLast]}>
      {live && <TrayContent drag={drag} side={side} icon={icon} label={label} />}
    </View>
  );
}

/** Icon grows with the drag and pops (with a tick) at the commit point. */
function TrayContent({
  drag,
  side,
  icon,
  label,
}: {
  drag: SharedValue<number>;
  side: 'left' | 'right';
  icon: IconName;
  label: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const armed = useSharedValue(0);
  const sign = side === 'left' ? 1 : -1;
  useAnimatedReaction(
    () => drag.get() * sign > SWIPE_AT,
    (now, before) => {
      if (now === before) return;
      armed.set(withSpring(now ? 1 : 0, { damping: 14, stiffness: 320 }));
      if (now) scheduleOnRN(tapFeedback);
    },
  );
  const style = useAnimatedStyle(() => {
    const p = interpolate(drag.get() * sign, [0, SWIPE_AT], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ scale: 0.6 + p * 0.4 + armed.get() * 0.18 }] };
  });
  return (
    <Animated.View style={[styles.trayInner, style]}>
      <Ionicons name={icon} size={20} color={t.colors.white} />
      <Text variant="caption" weight="bold" color={t.colors.white}>
        {label}
      </Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  clip: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowSelected: { backgroundColor: t.colors.primarySoft },
  lead: { width: 22, alignItems: 'center', paddingTop: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  flex: { flex: 1, gap: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  action: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    justifyContent: 'center',
  },
  actionStrong: { backgroundColor: t.dark ? t.colors.accent : t.colors.primary },
  // Matches its row's place in the panel (ListRow leaves 12 under a group's last row).
  tray: { width: 96, alignItems: 'center', justifyContent: 'center' },
  trayInner: { alignItems: 'center', gap: 2 },
  trayTL: { borderTopLeftRadius: t.radius.md },
  trayBL: { borderBottomLeftRadius: t.radius.md },
  trayTR: { borderTopRightRadius: t.radius.md },
  trayBR: { borderBottomRightRadius: t.radius.md },
  trayLast: { marginBottom: 12 },
}));
