/** @author Lokesh */
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Stop, Circle } from 'react-native-svg';

import { PETAL_GRADIENTS, PETALS, XMARK_CENTER, XMARK_VIEWBOX, type PetalKey } from './xmark-paths';

type Props = {
  size: number;
  variant?: 'color' | 'onDark';
  spread?: SharedValue<number>;
  rotation?: SharedValue<number>;
  glow?: SharedValue<number>;
};

const KEYS = Object.keys(PETALS) as PetalKey[];

function Petal({ k, size, variant, spread }: { k: PetalKey; size: number; variant: 'color' | 'onDark'; spread?: SharedValue<number> }) {
  const petal = PETALS[k];
  const [from, to] = PETAL_GRADIENTS[variant][petal.tone];
  const push = size * 0.14;
  const style = useAnimatedStyle(() => {
    const s = spread ? spread.get() : 0;
    return { transform: [{ translateX: petal.dir[0] * push * s }, { translateY: petal.dir[1] * push * s }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={XMARK_VIEWBOX}>
        <Defs>
          <LinearGradient id={`g-${k}`} x1="0" y1={petal.dir[1] < 0 ? '0' : '1'} x2="1" y2={petal.dir[1] < 0 ? '1' : '0'}>
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Path d={petal.d} fill={`url(#g-${k})`} fillRule="evenodd" />
      </Svg>
    </Animated.View>
  );
}

/** The XSERP "X": original petal geometry, enhanced with two-tone gradients and a centre glow. */
export function XMark({ size, variant = 'color', spread, rotation, glow }: Props) {
  const rotate = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation ? rotation.get() : 0}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow ? glow.get() : 0.55 }));
  return (
    <Animated.View style={[{ width: size, height: size }, rotate]} accessibilityRole="image" accessibilityLabel="XSERP">
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, glowStyle]}>
        <Svg width={size} height={size} viewBox={XMARK_VIEWBOX}>
          <Defs>
            <RadialGradient id="xglow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#5CC3FF" stopOpacity={0.9} />
              <Stop offset="1" stopColor="#5CC3FF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={XMARK_CENTER.x} cy={XMARK_CENTER.y} r={22} fill="url(#xglow)" />
        </Svg>
      </Animated.View>
      <View style={{ width: size, height: size }}>
        {KEYS.map((k) => (
          <Petal key={k} k={k} size={size} variant={variant} spread={spread} />
        ))}
      </View>
    </Animated.View>
  );
}
