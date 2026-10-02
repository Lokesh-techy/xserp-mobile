/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme, type Tone } from '@/core/theme';

import { Text } from './text';

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const t = useTheme();
  const styles = useStyles();
  const c = toneColors(t, tone);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text variant="caption" weight="bold" color={c.fg}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: t.radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
}));
