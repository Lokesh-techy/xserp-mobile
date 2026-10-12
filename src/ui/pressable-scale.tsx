/** @author Lokesh */
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { tapFeedback } from '@/core/utils';
import { easeOut, springs } from '@/core/theme';

type Props = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  /** Return a promise to keep the control disabled (and dimmed) until the work finishes. */
  onPress?: (e: GestureResponderEvent) => void | Promise<unknown>;
};

// A second tap this soon after the first is treated as an accidental double tap.
const DOUBLE_TAP_MS = 450;
// Holding the highlight back this long means a scroll that starts on a row never flashes it.
const PRESS_DELAY_MS = 45;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const isPromise = (v: unknown): v is Promise<unknown> => !!v && typeof (v as Promise<unknown>).then === 'function';

export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);
  const lastPress = useRef(0);
  const [busy, setBusy] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }], opacity: dim.get() }));

  return (
    <AnimatedPressable
      unstable_pressDelay={PRESS_DELAY_MS}
      {...rest}
      disabled={disabled || busy}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: 90, easing: easeOut }));
        dim.set(withTiming(0.86, { duration: 90, easing: easeOut }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, springs.snappy));
        if (!busy) dim.set(withTiming(1, { duration: 200, easing: easeOut }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        const now = Date.now();
        if (busy || now - lastPress.current < DOUBLE_TAP_MS) return;
        lastPress.current = now;
        if (haptic) tapFeedback();
        const result = onPress?.(e);
        if (isPromise(result)) {
          setBusy(true);
          dim.set(withTiming(0.6, { duration: 120 }));
          result
            .finally(() => {
              setBusy(false);
              dim.set(withTiming(1, { duration: 180 }));
            })
            .catch(() => {});
        }
      }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
}
