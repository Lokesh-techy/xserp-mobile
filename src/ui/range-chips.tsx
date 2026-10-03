/** @author Lokesh */
import { useState } from 'react';
import { View } from 'react-native';

import { toApiDate, type DateRange } from '@/core/utils';

import { rangePresets } from './filter-sheet';
import { usePlacement } from './header-slot';
import { MenuButton } from './menu-button';
import { rangeLabel, rangeShort, RangePickerSheet } from './range-picker';

type Props = { value: DateRange; onChange: (r: DateRange) => void; fyStartDay?: string | null; nested?: object };

/** Date range as a menu button ("Last 30 days ⌄"): the usual presets, plus "Custom range…" for any From → To. */
export function RangeChips({ value, onChange, fyStartDay }: Props) {
  const [custom, setCustom] = useState(false);
  const presets = rangePresets(fyStartDay);
  const same = (r: DateRange) =>
    toApiDate(r.since) === toApiDate(value.since) && toApiDate(r.till) === toApiDate(value.till);
  const current = presets.find((p) => same(p.range));
  const menu = (
    <MenuButton
      title="Date range"
      icon="calendar-outline"
      options={[
        ...presets.map((p) => ({ key: p.key, label: p.label, short: p.short })),
        {
          key: 'custom',
          label: current ? 'Custom range…' : rangeLabel(value),
          short: rangeShort(value),
          detail: current ? 'Pick any From and To' : 'Tap to change',
        },
      ]}
      value={current?.key ?? 'custom'}
      onChange={(k) => {
        if (k === 'custom') return setCustom(true);
        const p = presets.find((x) => x.key === k);
        if (p) onChange(p.range);
      }}
    />
  );
  return (
    <>
      {usePlacement() ? menu : <View style={{ flexDirection: 'row' }}>{menu}</View>}
      <RangePickerSheet
        visible={custom}
        value={value}
        presets={presets}
        onApply={onChange}
        onClose={() => setCustom(false)}
      />
    </>
  );
}
