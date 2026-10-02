/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

// Slow-drifting light orbs over the brand gradient. Pure transforms, so it stays on the UI thread.
function Orb({ size, color, x, y, drift, duration }: { size: number; color: string; x: number; y: number; drift: number; duration: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, duration]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.get() * drift }, { translateY: t.get() * -drift * 0.6 }, { scale: 1 + t.get() * 0.03 }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function AmbientBackground({ children }: { children?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={t.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Orb size={320} color={t.alpha.orb} x={-120} y={-80} drift={40} duration={9000} />
      <Orb size={240} color={t.alpha.orbSoft} x={200} y={120} drift={-30} duration={11000} />
      <Orb size={200} color={t.alpha.orbGreen} x={40} y={300} drift={26} duration={13000} />
      {children}
    </View>
  );
}
