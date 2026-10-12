/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, type ReactNode } from 'react';
import { Platform, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { alpha, useTheme } from '@/core/theme';

import { Badge } from './badge';
import type { IconName } from './button';
import { PressableScale } from './pressable-scale';

// iOS 26+ Liquid Glass. Everywhere else the fallback style keeps the translucent look.
export const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Applied only when Liquid Glass is unavailable — usually a translucent background. */
  fallbackStyle?: StyleProp<ViewStyle>;
  tint?: ColorValue;
  variant?: 'regular' | 'clear';
  interactive?: boolean;
};

export function Glass({ children, style, fallbackStyle, tint, variant = 'regular', interactive }: GlassProps) {
  if (liquidGlass) {
    return (
      <GlassView style={style} glassEffectStyle={variant} tintColor={tint} isInteractive={interactive}>
        {children}
      </GlassView>
    );
  }
  return <View style={[style, fallbackStyle]}>{children}</View>;
}

type ButtonProps = {
  icon: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  tint?: ColorValue;
  fallbackColor?: string;
  active?: boolean;
  badge?: number;
  /** Swings the icon like a ringing bell, every couple of seconds, for as long as it is true. */
  ringing?: boolean;
  accessibilityLabel?: string;
};

// One ring: a quick swing that dies away, then a pause before the next.
const SWING = [14, -12, 9, -6, 3, 0];
const SWING_MS = 85;
const RING_PAUSE_MS = 2200;

/** Wraps an icon so it rocks from its top edge, the way a bell hangs, while `active`. */
function Ringing({ active, children }: { active: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const angle = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(angle);
      angle.set(withTiming(0, { duration: 120 }));
      return;
    }
    const swing = SWING.map((a) => withTiming(a, { duration: SWING_MS, easing: Easing.inOut(Easing.quad) }));
    angle.set(
      withDelay(400, withRepeat(withSequence(...swing, withDelay(RING_PAUSE_MS, withTiming(0, { duration: 1 }))), -1)),
    );
    return () => cancelAnimation(angle);
  }, [active, reduceMotion, angle]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));
  return <Animated.View style={[{ transformOrigin: 'top center' }, style]}>{children}</Animated.View>;
}

/** Round floating icon button — glass on iOS 26, translucent circle elsewhere. */
export function GlassIconButton({
  icon,
  onPress,
  size = 42,
  color = '#FFFFFF',
  tint,
  fallbackColor = alpha.glassButton,
  active,
  badge,
  ringing = false,
  accessibilityLabel,
}: ButtonProps) {
  const t = useTheme();
  const shape = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  return (
    <PressableScale
      onPress={onPress}
      style={{ borderRadius: size / 2 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button">
      <Glass style={shape} fallbackStyle={{ backgroundColor: fallbackColor }} tint={tint} interactive>
        <Ringing active={ringing}>
          <Ionicons name={icon} size={Math.round(size * 0.5)} color={active ? t.colors.primary : color} />
        </Ringing>
      </Glass>
      {!!badge && <Badge count={badge} tone="primary" style={{ position: 'absolute', top: -4, right: -4 }} />}
    </PressableScale>
  );
}
