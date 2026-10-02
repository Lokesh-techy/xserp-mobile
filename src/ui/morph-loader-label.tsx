/** @author Lokesh */
import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { makeStyles, type Fonts } from '@/core/theme';

import { humanSpin, ringPoint, ringRadius } from './morph-loader-math';
import { Text, type TextVariant } from './text';

type Props = { title: string; loading: boolean; color: string; variant?: TextVariant; weight?: keyof Fonts };

type Box = { x: number; w: number };

const TURN_MS = 1150;
const TRAIL = 0.035; // each letter lags the one before it slightly, so the ring has a tail

function Letter({ ch, index, ringIndex, ringCount, box, rowWidth, morph, spin, color, variant, weight, onBox }: {
  ch: string;
  index: number;
  ringIndex: number;
  ringCount: number;
  box: Box | undefined;
  rowWidth: number;
  morph: SharedValue<number>;
  spin: SharedValue<number>;
  color: string;
  variant: TextVariant;
  weight?: keyof Fonts;
  onBox: (i: number, b: Box) => void;
}) {
  const style = useAnimatedStyle(() => {
    const m = morph.get();
    if (!box || ringIndex < 0) return { opacity: 1 - m };
    const r = ringRadius(ringCount);
    const lag = Math.min(1, Math.max(0, spin.get() - ringIndex * TRAIL));
    const turn = (humanSpin(lag) * Math.PI) / 180;
    const p = ringPoint(ringIndex, ringCount, r);
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const tx = p.x * cos - p.y * sin;
    const ty = p.x * sin + p.y * cos;
    const fromX = box.x + box.w / 2 - rowWidth / 2;
    return {
      transform: [{ translateX: (tx - fromX) * m }, { translateY: ty * m }, { scale: 1 - 0.45 * m }],
      opacity: 1 - 0.15 * m,
    };
  });
  return (
    <Animated.View style={style} onLayout={(e: LayoutChangeEvent) => onBox(index, { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}>
      <Text variant={variant} weight={weight} color={color}>
        {ch === ' ' ? ' ' : ch}
      </Text>
    </Animated.View>
  );
}

/**
 * A button label whose letters gather into a ring and spin while work is in progress, then fly back
 * into the word. Each revolution eases in and out and the letters trail one another, so the spin feels
 * hand-made rather than mechanical.
 */
export function MorphLoaderLabel({ title, loading, color, variant = 'heading', weight }: Props) {
  const styles = useStyles();
  const chars = [...title];
  const ringOf = (() => {
    let n = 0;
    return chars.map((c) => (c.trim() ? n++ : -1));
  })();
  const ringCount = ringOf.filter((i) => i >= 0).length;
  const [boxes, setBoxes] = useState<(Box | undefined)[]>([]);
  const [rowWidth, setRowWidth] = useState(0);
  const morph = useSharedValue(0);
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      morph.set(withSpring(1, { dampingRatio: 0.72, duration: 520 }));
      spin.set(0);
      spin.set(withRepeat(withTiming(1 + ringCount * TRAIL, { duration: TURN_MS, easing: Easing.linear }), -1, false));
      breathe.set(withRepeat(withTiming(1, { duration: TURN_MS / 2, easing: Easing.inOut(Easing.sin) }), -1, true));
    } else {
      cancelAnimation(spin);
      cancelAnimation(breathe);
      breathe.set(withTiming(0, { duration: 200 }));
      morph.set(withSpring(0, { dampingRatio: 0.8, duration: 480 }));
    }
  }, [loading, morph, spin, breathe, ringCount]);

  const row = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * breathe.get() * morph.get() }] }));
  const onBox = (i: number, b: Box) =>
    setBoxes((prev) => {
      if (prev[i]?.x === b.x && prev[i]?.w === b.w) return prev;
      const next = [...prev];
      next[i] = b;
      return next;
    });

  return (
    <Animated.View style={[styles.row, row]} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      {/* The whole word for screen readers (and text queries); the animated letters are decorative. */}
      <Text variant={variant} weight={weight} style={styles.ghost} accessibilityLabel={loading ? `${title}, working` : title}>
        {title}
      </Text>
      <View style={styles.letters} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {chars.map((ch, i) => (
          <Letter key={`${i}-${ch}`} ch={ch} index={i} ringIndex={ringOf[i] ?? -1} ringCount={ringCount} box={boxes[i]} rowWidth={rowWidth} morph={morph} spin={spin} color={color} variant={variant} weight={weight} onBox={onBox} />
        ))}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  row: { alignItems: 'center', justifyContent: 'center' },
  letters: { flexDirection: 'row' },
  ghost: { position: 'absolute', opacity: 0 },
}));
