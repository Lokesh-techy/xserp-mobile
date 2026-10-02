/** @author Lokesh */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { subDays } from 'date-fns';

import { financialYear, lastDays, thisMonth, toApiDate, type DateRange } from '@/core/utils';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { Chip } from './chip';
import { DateField } from './date-field';
import { PickerSheet, type PickerItem } from './picker-sheet';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export type FilterField =
  | { kind: 'dateRange'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'picker'; key: string; label: string; items: PickerItem[] };

export type FilterValues = Record<string, string | DateRange | null | undefined>;

const isRange = (v: unknown): v is DateRange => !!v && typeof v === 'object' && 'since' in v;
const same = (a: FilterValues[string], b: FilterValues[string]) =>
  isRange(a) && isRange(b) ? toApiDate(a.since) === toApiDate(b.since) && toApiDate(a.till) === toApiDate(b.till) : (a ?? null) === (b ?? null);

export function countActiveFilters(fields: FilterField[], value: FilterValues, defaults: FilterValues): number {
  return fields.filter((f) => !same(value[f.key], defaults[f.key])).length;
}

export function rangePresets(fyStartDay?: string | null) {
  return [
    { key: '7d', label: 'Last 7 days', range: lastDays(7) },
    { key: '30d', label: 'Last 30 days', range: lastDays(30) },
    { key: 'month', label: 'This month', range: thisMonth() },
    { key: 'fy', label: 'This FY', range: financialYear(fyStartDay) },
    { key: 'lastFy', label: 'Last FY', range: financialYear(fyStartDay, subDays(financialYear(fyStartDay).since, 1)) },
  ];
}

type Props = {
  visible: boolean;
  onClose: () => void;
  fields: FilterField[];
  value: FilterValues;
  defaults: FilterValues;
  onApply: (v: FilterValues) => void;
  fyStartDay?: string | null;
};

export function FilterSheet({ visible, onClose, fields, value, defaults, onApply, fyStartDay }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [draft, setDraft] = useState<FilterValues>(value);
  const [picking, setPicking] = useState<string | null>(null);
  // Re-seed the draft each time the sheet opens (state adjusted during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }

  const set = (key: string, v: FilterValues[string]) => setDraft((d) => ({ ...d, [key]: v }));
  const pickerField = fields.find((f): f is Extract<FilterField, { kind: 'picker' }> => f.kind === 'picker' && f.key === picking);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filters">
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {fields.map((f) => (
          <View key={f.key} style={styles.group}>
            <Text variant="overline" color={t.colors.textMuted}>
              {f.label}
            </Text>
            {f.kind === 'dateRange' && <RangeEditor value={draft[f.key]} onChange={(r) => set(f.key, r)} fyStartDay={fyStartDay} />}
            {f.kind === 'select' && (
              <View style={styles.wrap}>
                {f.options.map((o) => (
                  <Chip key={o.value} label={o.label} active={draft[f.key] === o.value} onPress={() => set(f.key, o.value)} />
                ))}
              </View>
            )}
            {f.kind === 'picker' && (
              <PressableScale onPress={() => setPicking(f.key)} style={styles.pickerBox}>
                <Text variant="label" color={draft[f.key] ? t.colors.text : t.colors.textFaint} numberOfLines={1}>
                  {f.items.find((i) => i.id === draft[f.key])?.label ?? `Any ${f.label.toLowerCase()}`}
                </Text>
              </PressableScale>
            )}
          </View>
        ))}
        <View style={styles.actions}>
          <Button title="Reset" variant="ghost" onPress={() => setDraft(defaults)} style={styles.flex} />
          <Button
            title="Apply"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={styles.flex}
          />
        </View>
      </ScrollView>
      {pickerField && (
        <PickerSheet
          visible
          title={pickerField.label}
          items={pickerField.items}
          selectedId={typeof draft[pickerField.key] === 'string' ? (draft[pickerField.key] as string) : null}
          onSelect={(item) => set(pickerField.key, item?.id ?? null)}
          onClose={() => setPicking(null)}
        />
      )}
    </BottomSheet>
  );
}

function RangeEditor({ value, onChange, fyStartDay }: { value: FilterValues[string]; onChange: (r: DateRange) => void; fyStartDay?: string | null }) {
  const styles = useStyles();
  const range = isRange(value) ? value : lastDays(30);
  return (
    <View style={styles.rangeRoot}>
      <View style={styles.wrap}>
        {rangePresets(fyStartDay).map((p) => (
          <Chip key={p.key} label={p.label} active={same(range, p.range)} onPress={() => onChange(p.range)} />
        ))}
      </View>
      <View style={styles.dates}>
        <DateField label="From" value={range.since} maximumDate={range.till} onChange={(d) => onChange({ ...range, since: d })} />
        <DateField label="To" value={range.till} minimumDate={range.since} onChange={(d) => onChange({ ...range, till: d })} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 20 },
  group: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeRoot: { gap: 12 },
  dates: { flexDirection: 'row', gap: 12 },
  pickerBox: { height: 50, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.fillSubtle, justifyContent: 'center', paddingHorizontal: 14 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  flex: { flex: 1 },
}));
