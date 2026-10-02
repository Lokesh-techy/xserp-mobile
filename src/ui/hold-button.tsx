/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';

import type { IconName } from './button';
import { Text } from './text';

export const HOLD_MS = 600;

type Props = { title: string; onComplete: () => void; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle> };

/**
 * Press-and-hold to confirm: a fill sweeps across while held and the action fires when it completes.
 * Makes accidental approvals impossible without an extra confirmation step.
 */
export function HoldButton({ title, onComplete, icon = 'checkmark-circle-outline', disabled, style }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [width, setWidth] = useState(0);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimation(progress);
    progress.set(withTiming(0, { duration: 180 }));
  };
  useEffect(() => reset, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => {});
    progress.set(withTiming(1, { duration: HOLD_MS, easing: Easing.linear }));
    timer.current = setTimeout(() => {
      timer.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete();
      progress.set(withTiming(0, { duration: 260 }));
    }, HOLD_MS);
  };

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <Pressable
      onPressIn={start}
      onPressOut={() => timer.current && reset()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Press and hold to confirm"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.base, disabled && styles.disabled, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.successSoft }]} />
      <Animated.View style={[styles.fill, fill]}>
        <LinearGradient colors={t.gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.row}>
        <Ionicons name={icon} size={16} color={t.colors.success} />
        <Text variant="label" color={t.colors.success}>
          {title}
        </Text>
      </View>
      <Animated.View style={[styles.fillLabel, fill]} pointerEvents="none">
        <View style={[styles.row, { width }]}>
          <Ionicons name={icon} size={16} color={t.colors.white} />
          <Text variant="label" color={t.colors.white} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: { height: 42, borderRadius: t.radius.sm, overflow: 'hidden', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  // A clipped white copy of the label rides on top of the fill so text stays readable mid-sweep.
  fillLabel: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, minWidth: 140 },
}));
