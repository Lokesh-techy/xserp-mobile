/** @author Lokesh */
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/core/theme';

import { Text } from '../text';
import { XMark } from './xmark';

const MARK = 160; // matches expo-splash-screen imageWidth so the hand-off is seamless

/**
 * Continues from the native splash (assembled X on navy): petals breathe out and snap together with a glow
 * pulse, the mark rises, and the wordmark fades up. Waits for `ready` before fading out.
 */
export function LaunchAnimation({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const t = useTheme();
  const spread = useSharedValue(0);
  const glow = useSharedValue(0.2);
  const lift = useSharedValue(0);
  const word = useSharedValue(0);
  const overlay = useSharedValue(1);
  const played = useSharedValue(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    spread.set(
      withSequence(
        withTiming(0.7, { duration: 360, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { dampingRatio: 0.55, duration: 520 }),
      ),
    );
    glow.set(withDelay(420, withSequence(withTiming(1, { duration: 220 }), withTiming(0.55, { duration: 480 }))));
    lift.set(withDelay(700, withSpring(1, { dampingRatio: 0.85, duration: 600 })));
    word.set(
      withDelay(
        820,
        withTiming(1, { duration: 420 }, () => played.set(true)),
      ),
    );
  }, [spread, glow, lift, word, played]);

  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      if (!played.get()) return;
      clearInterval(timer);
      overlay.set(
        withTiming(0, { duration: 320 }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      );
    }, 50);
    return () => clearInterval(timer);
  }, [ready, onDone, overlay, played]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -40 * lift.get() }, { scale: 1 - 0.3 * lift.get() }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.get(),
    transform: [{ translateY: 12 * (1 - word.get()) - 40 * lift.get() + 40 }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: overlay.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: t.colors.navy900 }, rootStyle]}>
      <Animated.View style={markStyle}>
        <XMark size={MARK} variant="onDark" spread={spread} glow={glow} />
      </Animated.View>
      <Animated.View style={[styles.words, wordStyle]}>
        <Text variant="display" color={t.alpha.onGradient} style={styles.wordmark}>
          XSERP
        </Text>
        <Text variant="overline" color={t.alpha.onGradientFaint}>
          by Schnell Energy
        </Text>
      </Animated.View>
      <View />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  // Full width (not content-sized) so Android can't clip the letter-spaced wordmark.
  words: { position: 'absolute', top: '58%', left: 0, right: 0, alignItems: 'center', gap: 6 },
  wordmark: { letterSpacing: 6, textAlign: 'center' },
});
