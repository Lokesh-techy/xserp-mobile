/** @author Lokesh */
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
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
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, useTheme } from '@/core/theme';

import { XMark } from '../brand/xmark';
import { phraseAt } from './messages';
import { HOLD, MIN_SYNC_MS, rubberBand, spreadFor, SYNC_LABELS, TRIGGER, type SyncPhase } from './phases';

const ICON = 44;
const PULL_SPREAD = 0.35; // petals only part slightly while pulling — restrained, not playful
const CALM = { dampingRatio: 1, duration: 420 }; // critically damped: settles without overshoot

const TENSION_STEPS = 4; // ticks before the trigger, each one stronger

/**
 * Pull feel: rising tension ticks while dragging, a heavy "snap" with a sharp double knock when it
 * gives way at the trigger, a firm rigid thud as it springs back on release, success when done.
 */
function haptic(kind: 'tension' | 'snap' | 'release' | 'done', level = 0) {
  const { ImpactFeedbackStyle: S } = Haptics;
  const hit = (style: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(style).catch(() => {});
  if (kind === 'tension') void hit(level < 2 ? S.Light : S.Medium);
  else if (kind === 'snap') {
    void hit(S.Heavy);
    setTimeout(() => void hit(S.Rigid), 70);
  } else if (kind === 'release') void hit(S.Rigid);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

type IndicatorProps = {
  pull: SharedValue<number>;
  phase: SharedValue<SyncPhase>;
  spread: SharedValue<number>;
  glow: SharedValue<number>;
  wave: SharedValue<number>;
  waveAmp: SharedValue<number>;
  pop: SharedValue<number>;
  useStatus?: () => string | null;
};

const noStatus = () => null;

/**
 * The X and its caption. Owns its own text state (driven by `phase` on the UI thread), so pulling and
 * syncing re-render only this component — never the screen around it.
 */
const PullIndicator = memo(function PullIndicator({
  pull,
  phase,
  spread,
  glow,
  wave,
  waveAmp,
  pop,
  useStatus = noStatus,
}: IndicatorProps) {
  const t = useTheme();
  const styles = useStyles();
  const status = useStatus();
  const [syncing, setSyncing] = useState(false);
  const [phrase, setPhrase] = useState(0);

  // Only the rotating phrase needs JS; which caption is visible is decided on the UI thread (below).
  useAnimatedReaction(
    () => phase.get() === 2,
    (now, prev) => {
      if (now !== prev) scheduleOnRN(setSyncing, now);
    },
  );
  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(() => setPhrase((p) => p + 1), 1600);
    return () => clearInterval(timer);
  }, [syncing]);

  const spacerStyle = useAnimatedStyle(() => ({ height: pull.get() }));
  const markStyle = useAnimatedStyle(() => {
    const p = Math.min(1, pull.get() / TRIGGER);
    return {
      opacity: interpolate(p, [0, 0.35, 1], [0, 0.55, 1]),
      // Pops when the pull gives way; breathes with the glow while syncing.
      transform: [
        {
          scale:
            interpolate(p, [0, 1], [0.7, 1]) * (1 + 0.15 * pop.get()) * (1 + (glow.get() - 0.3) * 0.12 * waveAmp.get()),
        },
      ],
    };
  });
  const captionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pull.get(), [TRIGGER * 0.5, TRIGGER * 0.9], [0, 1], 'clamp'),
  }));
  const fade = { duration: 120 };
  const c0 = useAnimatedStyle(() => ({ opacity: withTiming(phase.get() === 0 ? 1 : 0, fade) }));
  const c1 = useAnimatedStyle(() => ({ opacity: withTiming(phase.get() === 1 ? 1 : 0, fade) }));
  const c2 = useAnimatedStyle(() => ({ opacity: withTiming(phase.get() === 2 ? 1 : 0, fade) }));
  const c3 = useAnimatedStyle(() => ({ opacity: withTiming(phase.get() === 3 ? 1 : 0, fade) }));
  const syncText = status ? status.toUpperCase() : phraseAt(syncing ? phrase : 0);

  return (
    <Animated.View style={[styles.spacer, spacerStyle]}>
      <View style={styles.indicator}>
        <Animated.View style={markStyle}>
          <XMark size={ICON} variant="onDark" spread={spread} glow={glow} wave={wave} waveAmp={waveAmp} />
        </Animated.View>
        <Animated.View style={[styles.captions, captionsStyle]}>
          <Animated.Text style={[styles.caption, c0]}>{SYNC_LABELS[0]}</Animated.Text>
          <Animated.Text style={[styles.caption, styles.stacked, c1]}>{SYNC_LABELS[1]}</Animated.Text>
          <Animated.Text style={[styles.caption, styles.stacked, c2]} numberOfLines={1}>
            {syncText}
          </Animated.Text>
          <Animated.Text style={[styles.caption, styles.stacked, { color: t.alpha.successOnGradient }, c3]}>
            {SYNC_LABELS[3]}
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

/**
 * Branded pull-to-refresh. `useStatus` (optional, a hook) supplies the caption while syncing — e.g. the
 * real sync step; without it the caption cycles through friendly phrases.
 */
export function usePullToSync(onRefresh: () => Promise<unknown>, enabled = true, useStatus?: () => string | null) {
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
  const glow = useSharedValue(0.3);
  const pop = useSharedValue(0);
  const tick = useSharedValue(0);

  // Petals open a touch with the finger and close calmly once armed.
  useAnimatedReaction(
    () => ({ s: spreadFor(pull.get(), phase.get()), p: phase.get() }),
    (now, prev) => {
      if (now.p >= 1 && (prev?.p ?? 0) === 0) spread.set(withSpring(0, CALM));
      else if (now.p === 0) spread.set(now.s * PULL_SPREAD);
    },
  );

  const finish = useCallback(() => {
    cancelAnimation(wave);
    cancelAnimation(glow);
    waveAmp.set(withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) }));
    glow.set(
      withSequence(
        withTiming(0.85, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    phase.set(3);
    haptic('done');
    pull.set(
      withDelay(
        520,
        withSpring(0, CALM, (done) => {
          if (done) phase.set(0);
        }),
      ),
    );
  }, [wave, glow, waveAmp, phase, pull]);

  const startSync = useCallback(() => {
    const minimum = new Promise((resolve) => setTimeout(resolve, MIN_SYNC_MS));
    Promise.all([onRefresh().catch(() => undefined), minimum]).then(finish);
  }, [onRefresh, finish]);

  // The gesture only moves `phase` to 2 on the UI thread; this reaction starts the work. Keeping the
  // sync out of the gesture lets the gesture be built once (Android cancels a gesture reconfigured mid-pull).
  useAnimatedReaction(
    () => phase.get(),
    (now, prev) => {
      if (now === 2 && prev !== 2) scheduleOnRN(startSync);
    },
    [startSync],
  );

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const native = useMemo(() => Gesture.Native(), []);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .simultaneousWithExternalGesture(native)
        .enabled(enabled)
        .activeOffsetY([-12, 12])
        .onBegin(() => {
          base.set(0);
          tick.set(0);
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
          // Tension: a tick each quarter of the way, stronger as it nears the trigger.
          const level = Math.min(TENSION_STEPS, Math.floor((next / TRIGGER) * TENSION_STEPS));
          if (!armed && level > tick.get()) scheduleOnRN(haptic, 'tension', level);
          tick.set(level);
          if (armed && phase.get() === 0) {
            phase.set(1);
            pop.set(
              withSequence(
                withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
                withSpring(0, { dampingRatio: 0.55, duration: 380 }),
              ),
            );
            scheduleOnRN(haptic, 'snap');
          } else if (!armed && phase.get() === 1) {
            phase.set(0);
          }
        })
        .onFinalize(() => {
          if (phase.get() === 1) {
            // Springs back fast and lands with a firm thud.
            pull.set(withSpring(HOLD, { dampingRatio: 0.72, duration: 260 }));
            scheduleOnRN(haptic, 'release');
            // Light, not motion — started right here on the UI thread so it's instant even if JS is busy.
            wave.set(0);
            wave.set(
              reduceMotion ? 0.25 : withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false),
            );
            waveAmp.set(withTiming(1, { duration: 240 }));
            glow.set(withRepeat(withTiming(0.75, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true));
            phase.set(2);
          } else if (phase.get() === 0) {
            pull.set(withSpring(0, CALM));
          }
        }),
    [native, enabled, base, phase, blocked, scrollY, pull, wave, waveAmp, glow, reduceMotion, tick, pop],
  );

  const indicator = (
    <PullIndicator
      pull={pull}
      phase={phase}
      spread={spread}
      glow={glow}
      wave={wave}
      waveAmp={waveAmp}
      pop={pop}
      useStatus={useStatus}
    />
  );

  const attach = (list: ReactElement) => (
    <GestureDetector gesture={pan}>
      <View style={styles.flex}>
        <GestureDetector gesture={native}>{list}</GestureDetector>
      </View>
    </GestureDetector>
  );

  const scrollProps = {
    onScroll: scrollHandler,
    scrollEventThrottle: 16,
    bounces: false,
    overScrollMode: 'never' as const,
  };
  const nestedProps = useMemo(
    () => ({
      onTouchStart: () => blocked.set(true),
      onTouchEnd: () => blocked.set(false),
      onTouchCancel: () => blocked.set(false),
    }),
    [blocked],
  );

  // `pull` is the live stretch distance, for chrome outside the header that should travel with it.
  return { indicator, attach, scrollProps, nestedProps, scrollY, pull };
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  spacer: { overflow: 'hidden' },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // paddingRight: Android clips the last glyphs of letter-spaced text otherwise.
  captions: { alignItems: 'center', minWidth: 220 },
  stacked: { position: 'absolute', top: 0 },
  caption: {
    fontFamily: t.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    paddingRight: 3,
    color: t.alpha.onGradientMuted,
    textAlign: 'center',
  },
}));
