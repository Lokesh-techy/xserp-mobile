/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles, useTheme, useThemePreference, type ThemePreference } from '@/core/theme';
import { PressableScale, Text } from '@/ui';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Segmented System / Light / Dark switch — applies instantly, no restart. */
export function AppearanceControl() {
  const t = useTheme();
  const styles = useStyles();
  const { preference, setPreference } = useThemePreference();
  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const active = o.value === preference;
        return (
          <PressableScale key={o.value} onPress={() => setPreference(o.value)} style={[styles.segment, active && styles.active]} accessibilityRole="radio" accessibilityState={{ selected: active }}>
            <Text variant="label" color={active ? t.colors.white : t.colors.textMuted}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: { flexDirection: 'row', backgroundColor: t.colors.fill, borderRadius: t.radius.sm, padding: 3, gap: 3 },
  segment: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: t.colors.primary },
}));
