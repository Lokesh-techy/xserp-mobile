/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';

export function Bone({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const styles = useStyles();
  const x = useSharedValue(-1);
  useEffect(() => {
    x.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, [x]);
  const shimmer = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * 260 }] }));

  return (
    <View style={[styles.bone, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimmer]}>
        <LinearGradient
          colors={['transparent', t.colors.shimmer, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.sweep}
        />
      </Animated.View>
    </View>
  );
}

export function CardSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Bone style={{ width: 120, height: 14 }} />
        <Bone style={{ width: 70, height: 20, borderRadius: 999 }} />
      </View>
      <Bone style={{ width: '70%', height: 12, marginTop: 14 }} />
      <View style={[styles.row, { marginTop: 18 }]}>
        <Bone style={{ width: 90, height: 11 }} />
        <Bone style={{ width: 100, height: 16 }} />
      </View>
    </View>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bone: { backgroundColor: t.colors.bone, borderRadius: 6, overflow: 'hidden' },
  sweep: { width: 160, height: '100%' },
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 18, marginBottom: 12, ...t.shadow.card },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
}));
