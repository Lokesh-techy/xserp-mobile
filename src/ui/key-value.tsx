/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

export function KeyValue({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const shown = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View style={styles.row}>
      <Text variant="caption" color={t.colors.textMuted} style={styles.label}>
        {label}
      </Text>
      <Text variant="label" weight={mono ? 'bold' : 'semibold'} style={styles.value} selectable>
        {shown}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  label: { flexShrink: 0, maxWidth: '45%' },
  value: { flex: 1, textAlign: 'right' },
}));
