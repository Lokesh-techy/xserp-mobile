/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { isSameDay, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate } from '@/core/utils';

import { BottomSheet } from './bottom-sheet';
import { PressableScale } from './pressable-scale';
import { MonthCalendar, useMonth } from './range-picker/range-picker';
import { Text } from './text';

type Props = { label: string; value: Date; onChange: (d: Date) => void; minimumDate?: Date; maximumDate?: Date };

/** A date box that opens one calendar sheet; a single tap picks the day and closes it. */
export function DateField({ label, value, onChange, maximumDate }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.root}>
      <Text variant="label" color={t.colors.textMuted}>
        {label}
      </Text>
      <PressableScale
        onPress={() => setOpen(true)}
        style={styles.box}
        accessibilityLabel={`${label}: ${formatDate(value)}`}>
        <Ionicons name="calendar-outline" size={18} color={t.colors.textFaint} />
        <Text variant="label">{formatDate(value)}</Text>
      </PressableScale>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        {/* Mounted only while open, so it always starts on the chosen date's month. */}
        {open && (
          <DateSheetBody
            value={value}
            maximumDate={maximumDate}
            onPick={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        )}
      </BottomSheet>
    </View>
  );
}

function DateSheetBody({ value, maximumDate, onPick }: { value: Date; maximumDate?: Date; onPick: (d: Date) => void }) {
  const t = useTheme();
  const styles = useStyles();
  const cal = useMonth(value);
  const pick = (d: Date) => {
    Haptics.selectionAsync().catch(() => {});
    onPick(d);
  };
  const today = new Date();
  const quick = [
    { label: 'Today', date: today },
    { label: 'Yesterday', date: subDays(today, 1) },
  ];
  return (
    <View style={styles.sheet}>
      <View style={styles.quick}>
        {quick.map((q) => {
          const on = isSameDay(q.date, value);
          return (
            <PressableScale
              key={q.label}
              onPress={() => pick(q.date)}
              scaleTo={0.95}
              style={[styles.chip, on && styles.chipOn]}>
              <Text variant="label" color={on ? t.colors.white : t.colors.textMuted}>
                {q.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <MonthCalendar cal={cal} range={{ since: value, till: value }} onTap={pick} maxDate={maximumDate} />
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
  sheet: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, gap: 14 },
  quick: { flexDirection: 'row', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.fill,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: t.dark ? t.colors.accent : t.colors.primary },
}));
