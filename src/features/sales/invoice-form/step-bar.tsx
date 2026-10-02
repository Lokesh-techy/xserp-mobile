/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { PressableScale, Text } from '@/ui';

import type { stepStates } from './steps';

type Props = { steps: ReturnType<typeof stepStates>; onJump: (index: number) => void };

/** Tappable progress: ✓ done, red dot when a step has errors, jump to any step already reached. */
export function StepBar({ steps, onJump }: Props) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {steps.map((s, i) => {
        const current = s.state === 'current';
        const bg = current ? t.colors.primary : s.state === 'done' ? t.colors.successSoft : s.state === 'error' ? t.colors.dangerSoft : t.colors.fill;
        const fg = current ? t.colors.white : s.state === 'done' ? t.colors.success : s.state === 'error' ? t.colors.danger : t.colors.textFaint;
        return (
          <View key={s.key} style={styles.item}>
            {i > 0 && <View style={[styles.connector, { backgroundColor: s.state === 'upcoming' ? t.colors.border : t.colors.success }]} />}
            <PressableScale onPress={() => onJump(i)} disabled={!s.reachable} style={[styles.chip, { backgroundColor: bg }]} accessibilityRole="tab" accessibilityState={{ selected: current, disabled: !s.reachable }} accessibilityLabel={`Step ${i + 1}, ${s.title}${s.state === 'error' ? ', needs attention' : ''}`}>
              {s.state === 'done' ? (
                <Ionicons name="checkmark" size={14} color={fg} />
              ) : s.state === 'error' ? (
                <Ionicons name="alert" size={14} color={fg} />
              ) : (
                <Text variant="caption" weight="bold" color={fg}>
                  {i + 1}
                </Text>
              )}
              <Text variant="label" weight={current ? 'bold' : 'semibold'} color={fg}>
                {s.title}
              </Text>
            </PressableScale>
          </View>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  row: { paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center' },
  connector: { width: 14, height: 2, borderRadius: 1, marginHorizontal: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: t.radius.pill },
}));
