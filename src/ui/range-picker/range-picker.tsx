/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, useTheme } from '@/core/theme';
import type { DateRange } from '@/core/utils';

import { PressableScale } from '../pressable-scale';
import { Text } from '../text';
import { dayState, monthWeeks, pickDay, rangeDays, type RangeEnd } from './logic';

export type RangePreset = { key: string; label: string; short?: string; range: DateRange };

type Props = { value: DateRange; onChange: (r: DateRange) => void; presets: RangePreset[] };

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const same = (a: DateRange, b: DateRange) => isSameDay(a.since, b.since) && isSameDay(a.till, b.till);
const tick = () => Haptics.selectionAsync().catch(() => {});

/**
 * From → To picker: presets for the usual ranges, then a calendar where any two taps make a range.
 * The From/To tabs show which end the next tap sets; the band between them shows the span at a glance.
 */
export function RangePicker({ value, onChange, presets }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [editing, setEditing] = useState<RangeEnd>('since');
  const cal = useMonth(value.till);
  const focus = (end: RangeEnd) => {
    tick();
    setEditing(end);
    cal.show(end === 'since' ? value.since : value.till);
  };
  const tap = (day: Date) => {
    tick();
    const r = pickDay(value, day, editing);
    setEditing(r.next);
    onChange(r.range);
  };
  const preset = (p: RangePreset) => {
    tick();
    setEditing('since');
    cal.show(p.range.till);
    onChange(p.range);
  };

  const days = rangeDays(value);
  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
        {presets.map((p) => {
          const on = same(p.range, value);
          return (
            <PressableScale
              key={p.key}
              onPress={() => preset(p)}
              scaleTo={0.95}
              style={[styles.preset, on && styles.presetOn]}>
              <Text variant="label" color={on ? t.colors.white : t.colors.textMuted}>
                {p.label}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      <View style={styles.ends}>
        <End label="From" date={value.since} active={editing === 'since'} onPress={() => focus('since')} />
        <View style={styles.span}>
          <Ionicons name="arrow-forward" size={14} color={t.colors.textFaint} />
          <Text variant="caption" weight="bold" color={t.colors.textMuted} style={styles.num}>
            {days} {days === 1 ? 'day' : 'days'}
          </Text>
        </View>
        <End label="To" date={value.till} active={editing === 'till'} onPress={() => focus('till')} />
      </View>

      <MonthCalendar cal={cal} range={value} onTap={tap} />
    </View>
  );
}

/** Which month a calendar shows, and which way it last moved (for the slide-in). */
export function useMonth(initial: Date) {
  const [month, setMonth] = useState(() => startOfMonth(initial));
  const [dir, setDir] = useState(0);
  const go = (step: number) => {
    tick();
    setDir(step);
    setMonth((m) => addMonths(m, step));
  };
  const show = (d: Date) => {
    if (isSameMonth(d, month)) return;
    setDir(d < month ? -1 : 1);
    setMonth(startOfMonth(d));
  };
  return { month, dir, go, show };
}

type CalendarProps = { cal: ReturnType<typeof useMonth>; range: DateRange; onTap: (d: Date) => void; maxDate?: Date };

/** Month grid with arrows and sideways flicks. A single date is just a range whose ends are the same day. */
export function MonthCalendar({ cal, range, onTap, maxDate }: CalendarProps) {
  const t = useTheme();
  const styles = useStyles();
  const { month, dir, go } = cal;
  // Flick sideways to change month; vertical drags stay with the sheet.
  const fling = Gesture.Race(
    Gesture.Fling()
      .direction(1) // right → previous month
      .onEnd(() => scheduleOnRN(go, -1)),
    Gesture.Fling()
      .direction(2) // left → next month
      .onEnd(() => scheduleOnRN(go, 1)),
  );
  const atMax = !!maxDate && isSameMonth(month, maxDate);
  return (
    <View style={styles.calendar}>
      <View style={styles.monthBar}>
        <Text variant="heading">{format(month, 'MMMM yyyy')}</Text>
        <View style={styles.navs}>
          <PressableScale onPress={() => go(-1)} style={styles.nav} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={18} color={t.colors.text} />
          </PressableScale>
          <PressableScale
            onPress={() => go(1)}
            disabled={atMax}
            style={[styles.nav, atMax && styles.navOff]}
            accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={18} color={t.colors.text} />
          </PressableScale>
        </View>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((w, i) => (
          <Text
            key={i}
            variant="caption"
            weight="semibold"
            color={i > 4 ? t.colors.textFaint : t.colors.textMuted}
            style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <GestureDetector gesture={fling}>
        <Animated.View
          key={month.toISOString()}
          entering={dir > 0 ? FadeInRight.duration(220) : dir < 0 ? FadeInLeft.duration(220) : undefined}>
          {monthWeeks(month).map((week, wi) => (
            <View key={wi} style={styles.row}>
              {week.map((day, di) =>
                day ? (
                  <Day
                    key={di}
                    day={day}
                    col={di}
                    range={range}
                    disabled={!!maxDate && day > maxDate}
                    onPress={onTap}
                  />
                ) : (
                  <View key={di} style={styles.cell} />
                ),
              )}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function End({ label, date, active, onPress }: { label: string; date: Date; active: boolean; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      style={[styles.end, active && styles.endOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} ${format(date, 'd MMMM yyyy')}`}>
      <Text variant="caption" weight="semibold" color={active ? t.colors.onPrimarySoft : t.colors.textFaint}>
        {label}
      </Text>
      <Text variant="heading" color={active ? t.colors.text : t.colors.textMuted} numberOfLines={1}>
        {format(date, 'd MMM')}
      </Text>
      <Text variant="caption" color={t.colors.textFaint}>
        {format(date, 'EEE, yyyy')}
      </Text>
    </PressableScale>
  );
}

const Day = memo(function Day({
  day,
  col,
  range,
  disabled,
  onPress,
}: {
  day: Date;
  col: number;
  range: DateRange;
  disabled?: boolean;
  onPress: (d: Date) => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const { inRange, isStart, isEnd } = dayState(day, range);
  const edge = isStart || isEnd;
  const today = isSameDay(day, new Date());
  const lastOfMonth = isSameDay(day, new Date(day.getFullYear(), day.getMonth() + 1, 0));
  // The band runs edge to edge between the ends, rounding off at week and month boundaries.
  const band = inRange && !(isStart && isEnd) && (
    <View
      style={[
        styles.band,
        isStart && styles.bandFromMid,
        isEnd && styles.bandToMid,
        (col === 0 || day.getDate() === 1) && !isStart && styles.bandRoundL,
        (col === 6 || lastOfMonth) && !isEnd && styles.bandRoundR,
      ]}
    />
  );
  return (
    <Pressable
      onPress={() => onPress(day)}
      disabled={disabled}
      style={[styles.cell, disabled && styles.cellOff]}
      accessibilityRole="button"
      accessibilityState={{ selected: edge, disabled }}
      accessibilityLabel={format(day, 'EEEE d MMMM')}>
      {band}
      <View style={[styles.dot, edge && styles.dotEdge, today && !edge && styles.dotToday]}>
        <Text
          variant="label"
          weight={edge ? 'bold' : inRange ? 'semibold' : 'medium'}
          color={
            edge ? t.colors.white : inRange ? t.colors.onPrimarySoft : col > 4 ? t.colors.textMuted : t.colors.text
          }
          style={styles.num}>
          {day.getDate()}
        </Text>
      </View>
    </Pressable>
  );
});

const CELL = 44;
const DOT = 38;

const useStyles = makeStyles((t) => ({
  root: { gap: 14 },
  calendar: { gap: 14 },
  num: { fontVariant: ['tabular-nums'] },
  presets: { gap: 8, paddingRight: 4 },
  preset: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.fill,
    justifyContent: 'center',
  },
  presetOn: { backgroundColor: t.dark ? t.colors.accent : t.colors.primary },
  // Two halves of one control; the active end lifts out of the tray.
  ends: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.md,
    padding: 4,
  },
  end: { flex: 1, paddingVertical: 9, paddingHorizontal: 12, borderRadius: t.radius.sm, gap: 1 },
  endOn: { backgroundColor: t.colors.surface, ...t.shadow.card, shadowOpacity: 0.1 },
  span: { width: 58, alignItems: 'center', justifyContent: 'center', gap: 2 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  navs: { flexDirection: 'row', gap: 6 },
  nav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navOff: { opacity: 0.35 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' },
  cellOff: { opacity: 0.3 },
  band: {
    position: 'absolute',
    top: (CELL - DOT) / 2,
    bottom: (CELL - DOT) / 2,
    left: 0,
    right: 0,
    backgroundColor: t.colors.primarySoft,
  },
  bandFromMid: { left: '50%' },
  bandToMid: { right: '50%' },
  bandRoundL: { borderTopLeftRadius: DOT / 2, borderBottomLeftRadius: DOT / 2, left: 3 },
  bandRoundR: { borderTopRightRadius: DOT / 2, borderBottomRightRadius: DOT / 2, right: 3 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotEdge: { backgroundColor: t.dark ? t.colors.accent : t.colors.primary, ...t.shadow.button, shadowOpacity: 0.22 },
  dotToday: { borderWidth: 1.5, borderColor: t.colors.accent },
}));
