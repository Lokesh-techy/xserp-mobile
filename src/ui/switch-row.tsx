/** @author Lokesh */
import { Switch, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

/** On/off option as a native switch row (instead of a toggle pill). */
export function SwitchRow({
  label,
  value,
  onChange,
  detail,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  detail?: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="label">{label}</Text>
        {!!detail && (
          <Text variant="caption" color={t.colors.textMuted}>
            {detail}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: t.colors.accent, false: t.colors.border }}
        thumbColor={t.colors.white}
        accessibilityLabel={label}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  flex: { flex: 1, gap: 2 },
}));
