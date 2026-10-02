/** @author Lokesh */
import { useState } from 'react';
import { View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { makeStyles, springs, useTheme } from '@/core/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Option<K extends string> = { key: K; label: string };

/** Native-style two/three-way switch with a sliding thumb (Invoice ↔ OA, Receivable ↔ Payable). */
export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<K>[];
  value: K;
  onChange: (k: K) => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const [layouts, setLayouts] = useState<Partial<Record<K, LayoutRectangle>>>({});
  const active = layouts[value];
  const thumb = useAnimatedStyle(() => ({
    opacity: active ? 1 : 0,
    width: withSpring(active?.width ?? 0, springs.snappy),
    transform: [{ translateX: withSpring(active?.x ?? 0, springs.snappy) }],
  }));
  return (
    <View style={styles.track} accessibilityRole="tablist">
      <Animated.View style={[styles.thumb, thumb]} />
      {options.map((o) => {
        const on = o.key === value;
        return (
          <PressableScale
            key={o.key}
            onPress={() => onChange(o.key)}
            scaleTo={0.97}
            style={styles.segment}
            onLayout={(e) => {
              const l = e.nativeEvent.layout;
              setLayouts((p) => (p[o.key]?.x === l.x && p[o.key]?.width === l.width ? p : { ...p, [o.key]: l }));
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}>
            <Text variant="label" weight={on ? 'bold' : 'semibold'} color={on ? t.colors.text : t.colors.textMuted}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: { flexDirection: 'row', backgroundColor: t.colors.fill, borderRadius: 12, padding: 3 },
  thumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: 9,
    backgroundColor: t.colors.surface,
    ...t.shadow.card,
    shadowOpacity: 0.12,
  },
  segment: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center' },
}));
