/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { PressableScale, Text, withPressFeel, XMark } from '@/ui';

const HEIGHT = 40;
const DISC = 32;
const INSET = (HEIGHT - DISC) / 2;
const GAP = 10;
const PAD_LEFT = 16;
const MARK = 20;
// One flick: the mark whips round twice and coasts down, then is flicked again — a fidget spinner.
const FLICK_MS = 1300;
// The whole reveal: spin settles, the pill grows out from under the mark, the label arrives, the arrow takes over.
const REVEAL_MS = 900;

/** Ease-out cubic. A worklet: it runs inside animated styles on the UI thread. */
function ease(v: number) {
  'worklet';
  return 1 - (1 - v) * (1 - v) * (1 - v);
}

/**
 * The app's signature action: a solid navy pill — label, then an arrow in a white disc.
 * Until every queue has loaded it isn't a button yet: just the white disc on a blue circle, with the XSERP
 * mark spinning in it like a fidget spinner where the arrow will be. Once ready, the blue circle grows
 * leftwards into the pill, the label fades in, and the mark gives way to the arrow.
 */
export function ReviewButton({ label, ready, onPress }: { label: string; ready: boolean; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const [labelWidth, setLabelWidth] = useState(0);
  // Already loaded on first paint (cached queues): show the finished button, no animation.
  const p = useSharedValue(ready ? 1 : 0);
  const spin = useSharedValue(0);
  const full = useSharedValue(0);
  const wasReady = useRef(ready);

  useEffect(() => {
    full.set(PAD_LEFT + labelWidth + GAP + DISC + INSET);
  }, [labelWidth, full]);

  useEffect(() => {
    if (!ready) {
      wasReady.current = false;
      p.set(0);
      if (!reduceMotion) {
        spin.set(0);
        // 720° ≡ 0°, so each restart is seamless; the ease-out gives the flick-and-coast feel.
        spin.set(withRepeat(withTiming(720, { duration: FLICK_MS, easing: Easing.out(Easing.cubic) }), -1, false));
      }
      return;
    }
    if (wasReady.current) return;
    wasReady.current = true;
    cancelAnimation(spin);
    // The X has four-fold symmetry: coast on to the next quarter turn plus one more lap, then rest square.
    const rest = Math.ceil(spin.get() / 90) * 90 + 360;
    spin.set(reduceMotion ? 0 : withTiming(rest, { duration: REVEAL_MS * 0.6, easing: Easing.out(Easing.cubic) }));
    p.set(reduceMotion ? 1 : withTiming(1, { duration: REVEAL_MS, easing: Easing.linear }));
  }, [ready, reduceMotion, p, spin]);

  // The pill itself is the blue layer behind the spinning mark: a glowing circle while loading,
  // then, anchored at the right, it grows leftwards to full width.
  const pillStyle = useAnimatedStyle(() => {
    const g = ease(interpolate(p.get(), [0.2, 0.75], [0, 1], 'clamp'));
    return { width: HEIGHT + (full.get() - HEIGHT) * g };
  });
  const labelStyle = useAnimatedStyle(() => {
    const v = ease(interpolate(p.get(), [0.55, 0.9], [0, 1], 'clamp'));
    return { opacity: v, transform: [{ translateX: 8 * (1 - v) }] };
  });
  // The mark spins, settles, then shrinks away as the arrow grows in on the same spot.
  const markStyle = useAnimatedStyle(() => {
    const out = interpolate(p.get(), [0.65, 0.85], [1, 0], 'clamp');
    return { opacity: out, transform: [{ rotate: `${spin.get()}deg` }, { scale: 0.6 + 0.4 * out }] };
  });
  const arrowStyle = useAnimatedStyle(() => {
    const v = ease(interpolate(p.get(), [0.72, 1], [0, 1], 'clamp'));
    return { opacity: v, transform: [{ scale: 0.6 + 0.4 * v }, { translateX: -4 * (1 - v) }] };
  });

  return (
    <PressableScale
      onPress={withPressFeel(onPress)}
      disabled={!ready}
      haptic={false}
      scaleTo={0.96}
      style={styles.root}
      accessibilityRole="button"
      accessibilityLabel={ready ? label : 'Loading approvals'}
      accessibilityState={{ busy: !ready, disabled: !ready }}>
      <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />
      <View style={styles.inner}>
        <Animated.View style={labelStyle}>
          <Text
            variant="label"
            weight="bold"
            color={t.colors.white}
            numberOfLines={1}
            onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}>
            {label}
          </Text>
        </Animated.View>
        <View style={styles.slot}>
          <View style={styles.disc} />
          <Animated.View style={[styles.center, markStyle]}>
            <XMark size={MARK} />
          </Animated.View>
          <Animated.View style={[styles.center, arrowStyle]}>
            <Ionicons name="arrow-forward" size={16} color={t.colors.primary} />
          </Animated.View>
        </View>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  root: { alignSelf: 'center', height: HEIGHT, justifyContent: 'center' },
  pill: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: t.colors.primary,
    ...t.shadow.button,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    height: HEIGHT,
    paddingLeft: PAD_LEFT,
    paddingRight: INSET,
  },
  slot: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  disc: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: DISC / 2,
    backgroundColor: t.colors.white,
  },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
}));
