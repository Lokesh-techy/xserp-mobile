/** @author Lokesh */
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, useTheme } from '@/core/theme';

import { XMark } from '../brand/xmark';
import { phraseAt } from './messages';
import { HOLD, MIN_SYNC_MS, rubberBand, spreadFor, SYNC_LABELS, TRIGGER, type SyncPhase } from './phases';

const ICON = 44;

/**
 * `statusText` (optional) is what the caption says while syncing, e.g. the real sync step; without it the
 * caption cycles through friendly phrases so it never looks stuck.
 */
export function usePullToSync(onRefresh: () => Promise<unknown>, enabled = true, statusText?: string | null) {
  const t = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const scrollY = useSharedValue(0);
  const pull = useSharedValue(0);
  const phase = useSharedValue<SyncPhase>(0);
  const base = useSharedValue(0);
  const blocked = useSharedValue(false);
  const spread = useSharedValue(0);
  const wave = useSharedValue(0);
  const waveAmp = useSharedValue(0);
  const glow = useSharedValue(0.35);
  const [phrase, setPhrase] = useState(0);
  const [label, setLabel] = useState<SyncPhase>(0);

  // Petals follow the finger, but snap together with a spring when the gesture arms.
  useAnimatedReaction(
    () => ({ s: spreadFor(pull.get(), phase.get()), p: phase.get() }),
    (now, prev) => {
      if (now.p >= 1 && (prev?.p ?? 0) === 0) spread.set(withSpring(0, { dampingRatio: 0.5, duration: 420 }));
      else if (now.p === 0) spread.set(now.s);
    },
  );

  const haptic = (kind: 'arm' | 'release' | 'done') => {
    if (kind === 'arm') Haptics.selectionAsync().catch(() => {});
    else if (kind === 'release') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const settle = () => {
    pull.set(
      withDelay(
        480,
        withSpring(0, { dampingRatio: 0.9, duration: 520 }, (done) => {
          if (!done) return;
          phase.set(0);
          scheduleOnRN(setLabel, 0);
        }),
      ),
    );
  };

  const startSync = () => {
    setPhrase(0);
    setLabel(2);
    haptic('release');
    // The mark itself loads: petals pulse outward in a clockwise wave, the centre glows like a heartbeat.
    wave.set(0);
    wave.set(reduceMotion ? 0 : withRepeat(withTiming(1, { duration: 1300, easing: Easing.linear }), -1, false));
    waveAmp.set(withTiming(1, { duration: 260 }));
    glow.set(
      withRepeat(withSequence(withTiming(1, { duration: 160 }), withTiming(0.5, { duration: 200 }), withTiming(0.9, { duration: 160 }), withTiming(0.35, { duration: 780 })), -1, false),
    );
    const minimum = new Promise((resolve) => setTimeout(resolve, MIN_SYNC_MS));
    Promise.all([onRefresh().catch(() => undefined), minimum]).then(() => {
      cancelAnimation(wave);
      cancelAnimation(glow);
      // Petals settle back into a tight X and the glow flashes once: done.
      waveAmp.set(withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));
      glow.set(withSequence(withTiming(1, { duration: 140 }), withTiming(0.35, { duration: 620 })));
      phase.set(3);
      setLabel(3);
      haptic('done');
      settle();
    });
  };

  useEffect(() => {
    if (label !== 2) return;
    const timer = setInterval(() => setPhrase((p) => p + 1), 1200);
    return () => clearInterval(timer);
  }, [label]);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const native = Gesture.Native();
  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(native)
    .enabled(enabled)
    .activeOffsetY([-12, 12])
    .onBegin(() => {
      base.set(0);
    })
    .onUpdate((e) => {
      if (phase.get() >= 2) return;
      if (blocked.get() || scrollY.get() > 0.5) {
        base.set(e.translationY);
        if (phase.get() === 0) pull.set(0);
        return;
      }
      const next = rubberBand(Math.max(0, e.translationY - base.get()));
      pull.set(next);
      const armed = next >= TRIGGER;
      if (armed && phase.get() === 0) {
        phase.set(1);
        scheduleOnRN(setLabel, 1);
        scheduleOnRN(haptic, 'arm');
      } else if (!armed && phase.get() === 1) {
        phase.set(0);
        scheduleOnRN(setLabel, 0);
      }
    })
    .onFinalize(() => {
      if (phase.get() === 1) {
        phase.set(2);
        pull.set(withSpring(HOLD, { dampingRatio: 0.8, duration: 380 }));
        scheduleOnRN(startSync);
      } else if (phase.get() === 0) {
        pull.set(withSpring(0, { dampingRatio: 0.9, duration: 420 }));
      }
    });

  const spacerStyle = useAnimatedStyle(() => ({ height: pull.get() }));
  const markStyle = useAnimatedStyle(() => {
    const p = Math.min(1, pull.get() / TRIGGER);
    return { opacity: interpolate(p, [0, 0.3, 1], [0, 0.6, 1]), transform: [{ scale: interpolate(p, [0, 1], [0.5, 1]) * (phase.get() === 1 ? 1.08 : 1) }] };
  });
  const captionStyle = useAnimatedStyle(() => ({ opacity: interpolate(pull.get(), [TRIGGER * 0.45, TRIGGER * 0.85], [0, 1], 'clamp') }));

  const indicator = (
    <Animated.View style={[styles.spacer, spacerStyle]}>
      <View style={styles.indicator}>
        <Animated.View style={markStyle}>
          <XMark size={ICON} variant="onDark" spread={spread} glow={glow} wave={wave} waveAmp={waveAmp} />
        </Animated.View>
        <Animated.Text style={[styles.caption, captionStyle, label === 3 && { color: t.alpha.successOnGradient }]}>{label === 2 ? (statusText ? statusText.toUpperCase() : phraseAt(phrase)) : SYNC_LABELS[label]}</Animated.Text>
      </View>
    </Animated.View>
  );

  const attach = (list: ReactElement) => (
    <GestureDetector gesture={pan}>
      <View style={styles.flex}>
        <GestureDetector gesture={native}>{list}</GestureDetector>
      </View>
    </GestureDetector>
  );

  const scrollProps = { onScroll: scrollHandler, scrollEventThrottle: 16, bounces: false, overScrollMode: 'never' as const };
  const nestedProps = useMemo(
    () => ({ onTouchStart: () => blocked.set(true), onTouchEnd: () => blocked.set(false), onTouchCancel: () => blocked.set(false) }),
    [blocked],
  );

  // `pull` is the live stretch distance, for chrome outside the header that should travel with it.
  return { indicator, attach, scrollProps, nestedProps, scrollY, pull };
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  spacer: { overflow: 'hidden' },
  indicator: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', gap: 6 },
  // paddingRight: Android clips the last glyphs of letter-spaced text otherwise.
  caption: { fontFamily: t.fonts.semibold, fontSize: 11, letterSpacing: 0.6, paddingRight: 3, color: t.alpha.onGradientMuted },
}));
