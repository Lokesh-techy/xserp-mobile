/** @author Lokesh */
import { ScrollView, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

export type TypeOption = { key: string; label: string; tint: string; count: number };

type Props = { options: TypeOption[]; selected: string[]; onChange: (next: string[]) => void };

/** Multi-select document-type chips. Empty selection = all (shown as the "All" chip). */
export function TypeFilterBar({ options, selected, onChange }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const all = selected.length === 0;
  const total = options.reduce((n, o) => n + o.count, 0);
  const toggle = (key: string) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <PressableScale onPress={() => onChange([])} style={[styles.chip, all && { backgroundColor: t.colors.primary }]} accessibilityRole="checkbox" accessibilityState={{ checked: all }}>
        <Text variant="label" weight="bold" color={all ? t.colors.white : t.colors.textMuted}>
          All {total}
        </Text>
      </PressableScale>
      {options.map((o) => {
        const on = selected.includes(o.key);
        return (
          <PressableScale key={o.key} onPress={() => toggle(o.key)} style={[styles.chip, on && { backgroundColor: `${o.tint}26`, borderColor: o.tint }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
            <View style={[styles.dot, { backgroundColor: o.tint }]} />
            <Text variant="label" weight={on ? 'bold' : 'semibold'} color={on ? t.colors.text : t.colors.textMuted}>
              {o.label} {o.count}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  row: { gap: 8, paddingHorizontal: 18, paddingVertical: 10 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: t.radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.colors.fill, borderWidth: 1, borderColor: 'transparent' },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
