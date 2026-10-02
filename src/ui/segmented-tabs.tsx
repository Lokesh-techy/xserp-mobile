/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Badge } from './badge';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Tab<K extends string> = { key: K; label: string; badge?: number };

export function SegmentedTabs<K extends string>({ tabs, value, onChange }: { tabs: Tab<K>[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <PressableScale key={tab.key} onPress={() => onChange(tab.key)} style={[styles.tab, active && styles.active]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <Text variant="label" color={active ? t.colors.primary : t.alpha.onGradientMuted}>
              {tab.label}
            </Text>
            {!!tab.badge && <Badge count={tab.badge} style={styles.badge} />}
          </PressableScale>
        );
      })}
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
  row: { gap: 8, paddingRight: 8 },
  tab: { height: 36, paddingHorizontal: 14, borderRadius: t.radius.pill, backgroundColor: t.alpha.glassFill, borderWidth: 1, borderColor: t.alpha.glassBorder, flexDirection: 'row', alignItems: 'center', gap: 6 },
  active: { backgroundColor: t.colors.white, borderColor: t.colors.white },
  badge: { borderColor: 'transparent' },
}));
