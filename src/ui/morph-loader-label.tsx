/** @author Lokesh */
import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { makeStyles, type Fonts } from '@/core/theme';

import { humanSpin } from './morph-loader-math';
import { Text, type TextVariant } from './text';

type Props = { title: string; loading: boolean; color: string; variant?: TextVariant; weight?: keyof Fonts };
type Box = { x: number; w: number };

const ARC = 22; // spinner size
const R = 8.5;
const CIRC = 2 * Math.PI * R;
const TURN_MS = 1150;
const COLLAPSE_MS = 260;
const ease = Easing.bezier(0.4, 0, 0.2, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Letter({ ch, index, box, rowWidth, line, color, variant, weight, onBox }: {
  ch: string;
  index: number;
  box: Box | undefined;
  rowWidth: number;
  line: SharedValue<number>;
  color: string;
  variant: TextVariant;
  weight?: keyof Fonts;
  onBox: (i: number, b: Box) => void;
}) {
  // Letters slide toward the centre and flatten, becoming the line.
  const style = useAnimatedStyle(() => {
    const m = line.get();
    const toCentre = box ? rowWidth / 2 - (box.x + box.w / 2) : 0;
    return { opacity: interpolate(m, [0, 0.7], [1, 0], 'clamp'), transform: [{ translateX: toCentre * m }, { scaleX: 1 - 0.85 * m }, { scaleY: 1 - 0.6 * m }] };
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
 * A button label that turns into its own loader: the letters glide together into a thin line, the line
 * curls into a spinning arc (each turn eases in and out, like a hand-spun dial), and on completion it all
 * unwinds back into the word.
 */
export function MorphLoaderLabel({ title, loading, color, variant = 'heading', weight }: Props) {
  const styles = useStyles();
  const chars = [...title];
  const [boxes, setBoxes] = useState<(Box | undefined)[]>([]);
  const [rowWidth, setRowWidth] = useState(0);
  const line = useSharedValue(0); // 0 word → 1 line
  const arc = useSharedValue(0); // 0 line → 1 spinner
  const spin = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      line.set(withTiming(1, { duration: COLLAPSE_MS, easing: ease }));
      arc.set(withDelay(COLLAPSE_MS - 40, withTiming(1, { duration: 240, easing: ease })));
      spin.set(0);
      spin.set(withDelay(COLLAPSE_MS, withRepeat(withTiming(1, { duration: TURN_MS, easing: Easing.linear }), -1, false)));
    } else {
      cancelAnimation(spin);
      arc.set(withTiming(0, { duration: 180, easing: ease }));
      line.set(withDelay(120, withTiming(0, { duration: 300, easing: ease })));
    }
  }, [loading, line, arc, spin]);

  // The line: full-word width while forming, then shortens and fades as the arc takes over.
  const lineStyle = useAnimatedStyle(() => {
    const m = line.get();
    const a = arc.get();
    return { opacity: interpolate(m, [0.2, 0.6], [0, 1], 'clamp') * (1 - a), width: interpolate(a, [0, 1], [Math.max(ARC, rowWidth * 0.7), ARC * 0.9]) };
  });
  const arcStyle = useAnimatedStyle(() => ({ opacity: arc.get(), transform: [{ rotate: `${humanSpin(spin.get())}deg` }, { scale: 0.7 + 0.3 * arc.get() }] }));
  // The arc "draws itself" from a straight stroke into a three-quarter circle.
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - 0.72 * arc.get()) }));

  const onBox = (i: number, b: Box) =>
    setBoxes((prev) => {
      if (prev[i]?.x === b.x && prev[i]?.w === b.w) return prev;
      const next = [...prev];
      next[i] = b;
      return next;
    });

  return (
    <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      {/* The whole word for screen readers (and text queries); the animated letters are decorative. */}
      <Text variant={variant} weight={weight} style={styles.ghost} accessibilityLabel={loading ? `${title}, working` : title}>
        {title}
      </Text>
      <View style={styles.letters} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {chars.map((ch, i) => (
          <Letter key={`${i}-${ch}`} ch={ch} index={i} box={boxes[i]} rowWidth={rowWidth} line={line} color={color} variant={variant} weight={weight} onBox={onBox} />
        ))}
      </View>
      <View pointerEvents="none" style={styles.centre}>
        <Animated.View style={[styles.line, { backgroundColor: color }, lineStyle]} />
      </View>
      <View pointerEvents="none" style={styles.centre}>
        <Animated.View style={arcStyle}>
          <Svg width={ARC} height={ARC}>
            <AnimatedCircle cx={ARC / 2} cy={ARC / 2} r={R} stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" strokeDasharray={`${CIRC} ${CIRC}`} animatedProps={arcProps} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { alignItems: 'center', justifyContent: 'center' },
  letters: { flexDirection: 'row' },
  ghost: { position: 'absolute', opacity: 0 },
  centre: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  line: { height: 2.5, borderRadius: 2 },
}));
