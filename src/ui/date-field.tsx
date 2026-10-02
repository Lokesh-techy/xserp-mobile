/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate } from '@/core/utils';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Props = { label: string; value: Date; onChange: (d: Date) => void; minimumDate?: Date; maximumDate?: Date };

export function DateField({ label, value, onChange, minimumDate, maximumDate }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.root}>
      <Text variant="label" color={t.colors.textMuted}>
        {label}
      </Text>
      <PressableScale onPress={() => setOpen(true)} style={styles.box}>
        <Ionicons name="calendar-outline" size={18} color={t.colors.textFaint} />
        <Text variant="label">{formatDate(value)}</Text>
      </PressableScale>
      {open && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant={t.dark ? 'dark' : 'light'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, d) => {
            setOpen(Platform.OS === 'ios');
            if (event.type === 'set' && d) onChange(d);
            if (Platform.OS === 'ios' && event.type === 'dismissed') setOpen(false);
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, gap: 8 },
  box: {
    height: 50,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.fillSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
}));
