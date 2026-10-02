/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initials, useSession } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { GlassIconButton, PressableScale, Text } from '@/ui';

const greeting = (h: number) => (h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,');
export const COMPACT_AT = 96;

type Props = { pull: ReactNode; scrollY: SharedValue<number>; syncText: string; syncing: boolean };

const BIG = 44;
const SMALL = 36;
const GAP = 10;

/**
 * Bell + avatar stay on screen the whole time and shrink from the large header into the compact bar,
 * so they morph instead of swapping. Pinned top-right above both headers.
 */
export function HomeActions({ unread, scrollY }: { unread: number; scrollY: SharedValue<number> }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const width = BIG * 2 + GAP;
  const morph = useAnimatedStyle(() => {
    const p = interpolate(scrollY.get(), [COMPACT_AT - 30, COMPACT_AT + 10], [0, 1], Extrapolation.CLAMP);
    const s = 1 - p * (1 - SMALL / BIG);
    // Scale happens around the centre; shift so the right/top edges land where the compact bar wants them.
    const shrinkX = (width * (1 - s)) / 2;
    const shrinkY = (BIG * (1 - s)) / 2;
    return { transform: [{ translateX: shrinkX + p * 4 }, { translateY: -shrinkY - p * 8 }, { scale: s }] };
  });
  return (
    <Animated.View style={[styles.floating, { top: insets.top + 14, width }, morph]}>
      <GlassIconButton icon="notifications-outline" size={BIG} badge={unread} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications" />
      <PressableScale onPress={() => router.push('/profile')} style={styles.avatar} accessibilityLabel="Profile">
        <Text variant="label" weight="extrabold" color={t.colors.primary}>
          {initials(user) || 'U'}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

/** The large Home header: date, greeting and sync state. It drifts and fades as the page scrolls. */
export function HomeHeader({ pull, scrollY, syncText, syncing }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const now = new Date();
  const drift = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, COMPACT_AT], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.get(), [0, COMPACT_AT], [0, 28], Extrapolation.CLAMP) }, { scale: interpolate(scrollY.get(), [0, COMPACT_AT], [1, 0.96], Extrapolation.CLAMP) }],
  }));
  const orb = useAnimatedStyle(() => ({ transform: [{ translateY: scrollY.get() * 0.5 }] }));
  return (
    <LinearGradient colors={t.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.root, { paddingTop: insets.top + 14 }]}>
      <StatusBar style="light" />
      <Animated.View style={[styles.orb, orb]} />
      {pull}
      <Animated.View style={drift}>
        <View style={styles.top}>
          <Text variant="overline" color={t.alpha.onGradientFaint}>
            {format(now, 'EEEE, d MMMM')}
          </Text>
        </View>
        <Text variant="body" color={t.alpha.onGradientMuted} style={styles.greeting}>
          {greeting(now.getHours())}
        </Text>
        <Text variant="display" color={t.alpha.onGradient} numberOfLines={1}>
          {user.firstName || user.username || 'there'}
        </Text>
        <View style={styles.sync}>
          <Ionicons name={syncing ? 'sync-outline' : 'cloud-done-outline'} size={13} color={t.alpha.onGradientFaint} />
          <Text variant="caption" color={t.alpha.onGradientFaint}>
            {syncText}
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

/** Slim bar that takes over once the large header has scrolled away. */
export function CompactHomeBar({ scrollY }: { scrollY: SharedValue<number> }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const show = useAnimatedStyle(() => {
    const p = interpolate(scrollY.get(), [COMPACT_AT - 30, COMPACT_AT + 10], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - p) * -12 }] };
  });
  return (
    <Animated.View pointerEvents="box-none" style={[styles.compact, show]}>
      <LinearGradient colors={t.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.compactInner, { paddingTop: insets.top + 6 }]}>
        <Text variant="heading" color={t.alpha.onGradient} numberOfLines={1} style={styles.compactName}>
          {user.firstName || user.username}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { paddingHorizontal: 22, paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  orb: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -80, right: -90, backgroundColor: t.alpha.orb },
  top: { minHeight: BIG, justifyContent: 'center', paddingRight: BIG * 2 + GAP + 8 },
  floating: { position: 'absolute', right: 22, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: GAP },
  avatar: { width: BIG, height: BIG, borderRadius: BIG / 2, backgroundColor: t.colors.white, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  greeting: { marginTop: 18 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  compact: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  compactInner: { flexDirection: 'row', alignItems: 'center', minHeight: 0, paddingLeft: 18, paddingRight: 18 + SMALL * 2 + GAP, paddingBottom: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, ...t.shadow.lifted },
  compactName: { flex: 1, lineHeight: SMALL },
}));
