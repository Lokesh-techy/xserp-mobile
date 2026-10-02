/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initials, useSession } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { GlassIconButton, PressableScale, Text } from '@/ui';

const greeting = (h: number) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');

// One geometry shared by the large header, the mini bar and the morphing icons.
const BIG = 44; // icon size in the large header
const SMALL = 36; // icon size in the mini bar
const GAP = 10;
const BIG_TOP = 14; // below the safe area
const BIG_RIGHT = 22;
const MINI_PAD_X = 20;
const MINI_PAD_TOP = 10;
const MINI_PAD_BOTTOM = 14;
const MINI_ROW = 40; // two text lines: title 22 + caption 16 (+2)

/** Scroll distance over which the large header dissolves into the mini one. */
export const COLLAPSE = { start: 24, end: 120 } as const;

const progress = (y: number) => {
  'worklet';
  return interpolate(y, [COLLAPSE.start, COLLAPSE.end], [0, 1], Extrapolation.CLAMP);
};

type HeaderProps = { pull: ReactNode; scrollY: SharedValue<number>; syncText: string; syncing: boolean };

/** Large Home header: date, greeting, name, sync state. Shrinks and fades as the page scrolls. */
export function HomeHeader({ pull, scrollY, syncText, syncing }: HeaderProps) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const now = new Date();
  const dissolve = useAnimatedStyle(() => {
    const p = progress(scrollY.get());
    return {
      opacity: interpolate(p, [0, 0.75], [1, 0], Extrapolation.CLAMP),
      // Drifts slower than the page (parallax) and shrinks toward its top-left corner.
      transform: [{ translateY: scrollY.get() * 0.35 }, { scale: 1 - p * 0.08 }],
    };
  });
  const orb = useAnimatedStyle(() => ({ transform: [{ translateY: scrollY.get() * 0.5 }] }));
  return (
    <LinearGradient colors={t.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.root, { paddingTop: insets.top + BIG_TOP }]}>
      <StatusBar style="light" />
      <Animated.View style={[styles.orb, orb]} />
      {pull}
      <Animated.View style={[styles.content, dissolve]}>
        <View style={styles.top}>
          <Text variant="overline" color={t.alpha.onGradientFaint}>
            {format(now, 'EEEE, d MMMM')}
          </Text>
        </View>
        <Text variant="body" color={t.alpha.onGradientMuted} style={styles.greeting}>
          {greeting(now.getHours())},
        </Text>
        <Text variant="display" color={t.alpha.onGradient} numberOfLines={1}>
          {user.firstName || user.username || 'there'}
        </Text>
        <SyncLine text={syncText} syncing={syncing} />
      </Animated.View>
    </LinearGradient>
  );
}

/** Sync status; pops with a green check the moment a sync finishes. */
function SyncLine({ text, syncing }: { text: string; syncing: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const pop = useSharedValue(0);
  const wasSyncing = useSharedValue(syncing);
  useEffect(() => {
    if (wasSyncing.get() && !syncing) pop.set(withSequence(withSpring(1, { dampingRatio: 0.5, duration: 420 }), withTiming(0, { duration: 1400 })));
    wasSyncing.set(syncing);
  }, [syncing, pop, wasSyncing]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.get() * 0.06 }], opacity: 0.85 + pop.get() * 0.15 }));
  const done = !syncing && text.endsWith('just now');
  return (
    <Animated.View style={[styles.sync, style]}>
      <Ionicons name={syncing ? 'sync-outline' : done ? 'checkmark-circle' : 'cloud-done-outline'} size={13} color={done ? t.alpha.successOnGradient : t.alpha.onGradientFaint} />
      <Text variant="caption" color={done ? t.alpha.successOnGradient : t.alpha.onGradientFaint}>
        {text}
      </Text>
    </Animated.View>
  );
}

/** The mini header: name, date and sync state condensed into one padded bar (no greeting). */
export function MiniHomeHeader({ scrollY, syncText }: { scrollY: SharedValue<number>; syncText: string }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const now = new Date();
  const bar = useAnimatedStyle(() => ({ opacity: interpolate(progress(scrollY.get()), [0.35, 1], [0, 1], Extrapolation.CLAMP) }));
  const text = useAnimatedStyle(() => {
    const p = interpolate(progress(scrollY.get()), [0.5, 1], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - p) * 8 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.mini, bar]}>
      <LinearGradient
        colors={t.gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.miniInner, { paddingTop: insets.top + MINI_PAD_TOP }]}>
        <Animated.View style={[styles.miniText, text]}>
          <Text variant="heading" color={t.alpha.onGradient} numberOfLines={1}>
            {user.firstName || user.username}
          </Text>
          <Text variant="caption" color={t.alpha.onGradientFaint} numberOfLines={1}>
            {format(now, 'EEE, d MMM')} · {syncText}
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

/**
 * Bell + avatar stay on screen the whole time and glide from the large header into the mini bar,
 * so they morph instead of swapping.
 */
export function HomeActions({ unread, scrollY, pull }: { unread: number; scrollY: SharedValue<number>; pull: SharedValue<number> }) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const width = BIG * 2 + GAP;
  const morph = useAnimatedStyle(() => {
    const p = progress(scrollY.get());
    const s = 1 - p * (1 - SMALL / BIG);
    // Scaling is about the centre: shift so the right edge ends MINI_PAD_X from the screen edge and the
    // icons sit vertically centred in the mini bar's text row.
    const shrinkX = (width * (1 - s)) / 2;
    const shrinkY = (BIG * (1 - s)) / 2;
    const toRight = BIG_RIGHT - MINI_PAD_X;
    const toTop = BIG_TOP - (MINI_PAD_TOP + (MINI_ROW - SMALL) / 2);
    // While pulling to refresh, ride down with the stretching header instead of staying pinned.
    return { transform: [{ translateX: shrinkX + p * toRight }, { translateY: -shrinkY - p * toTop + pull.get() }, { scale: s }] };
  });
  return (
    <Animated.View style={[styles.actions, { top: insets.top + BIG_TOP, width }, morph]}>
      <GlassIconButton icon="notifications-outline" size={BIG} badge={unread} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications" />
      <PressableScale onPress={() => router.push('/profile')} style={styles.avatar} accessibilityLabel="Profile">
        <Text variant="label" weight="extrabold" color={t.colors.primary}>
          {initials(user) || 'U'}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { paddingHorizontal: BIG_RIGHT, paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  orb: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -80, right: -90, backgroundColor: t.alpha.orb },
  content: { transformOrigin: 'left top' },
  top: { minHeight: BIG, justifyContent: 'center', paddingRight: BIG * 2 + GAP + 8 },
  greeting: { marginTop: 18 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start', transformOrigin: 'left center' },
  mini: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  miniInner: {
    paddingLeft: MINI_PAD_X,
    paddingRight: MINI_PAD_X + SMALL * 2 + GAP + 12,
    paddingBottom: MINI_PAD_BOTTOM,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...t.shadow.lifted,
  },
  miniText: { minHeight: MINI_ROW, justifyContent: 'center' },
  actions: { position: 'absolute', right: BIG_RIGHT, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: GAP },
  avatar: { width: BIG, height: BIG, borderRadius: BIG / 2, backgroundColor: t.colors.white, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
}));
