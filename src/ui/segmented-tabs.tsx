/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useContext, useState } from 'react';
import { ScrollView, View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { makeStyles, springs, useTheme } from '@/core/theme';

import { Badge } from './badge';
import { TabsWidthContext } from './header-slot';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Tab<K extends string> = { key: K; label: string; badge?: number };

/** Text tabs with a sliding underline, shown on the page background just under the header bar. */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab<K>[];
  value: K;
  onChange: (k: K) => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const reportWidth = useContext(TabsWidthContext);
  const [layouts, setLayouts] = useState<Partial<Record<K, LayoutRectangle>>>({});
  const active = layouts[value];
  const indicator = useAnimatedStyle(() => ({
    opacity: active ? 1 : 0,
    transform: [{ translateX: withSpring(active?.x ?? 0, springs.snappy) }],
    width: withSpring(active?.width ?? 0, springs.snappy),
  }));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      onContentSizeChange={(w) => reportWidth?.(Math.ceil(w))}>
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <PressableScale
            key={tab.key}
            onPress={() => onChange(tab.key)}
            onLayout={(e) => {
              const l = e.nativeEvent.layout;
              setLayouts((prev) =>
                prev[tab.key]?.x === l.x && prev[tab.key]?.width === l.width ? prev : { ...prev, [tab.key]: l },
              );
            }}
            style={styles.tab}
            scaleTo={0.96}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}>
            <Text variant="label" weight={on ? 'bold' : 'semibold'} color={on ? t.colors.text : t.colors.textMuted}>
              {tab.label}
            </Text>
            {!!tab.badge && <Badge count={tab.badge} tone={on ? 'primary' : 'danger'} style={styles.badge} />}
          </PressableScale>
        );
      })}
      <Animated.View style={[styles.indicator, indicator]} />
      <View style={styles.baseline} />
    </ScrollView>
  );
}

/** Active tab lives in the URL (`?tab=pending`) so it survives navigation and can be deep-linked. */
export function useTabParam<K extends string>(keys: readonly K[], fallback: K): [K, (k: K) => void] {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const value = keys.includes(tab as K) ? (tab as K) : fallback;
  const set = useCallback((k: K) => router.setParams({ tab: k }), []);
  return [value, set];
}

const useStyles = makeStyles((t) => ({
  row: { paddingHorizontal: 18, gap: 22 },
  tab: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderColor: 'transparent' },
  indicator: { position: 'absolute', left: 0, bottom: 0, height: 3, borderRadius: 2, backgroundColor: t.colors.accent },
  baseline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: t.colors.divider },
}));
