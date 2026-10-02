/** @author Lokesh */
import { View } from 'react-native';

import { toApiDate, type DateRange } from '@/core/utils';

import { rangePresets } from './filter-sheet';
import { usePlacement } from './header-slot';
import { MenuButton } from './menu-button';

type Props = { value: DateRange; onChange: (r: DateRange) => void; fyStartDay?: string | null; nested?: object };

/** Date range as a menu button ("Last 30 days ⌄") — compact, and natural to change. */
export function RangeChips({ value, onChange, fyStartDay }: Props) {
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
        ...(current
          ? []
          : [{ key: 'custom', label: `${toApiDate(value.since)} – ${toApiDate(value.till)}`, short: 'Custom' }]),
      ]}
      value={current?.key ?? 'custom'}
      onChange={(k) => {
        const p = presets.find((x) => x.key === k);
        if (p) onChange(p.range);
      }}
    />
  );
  return !!usePlacement() ? menu : <View style={{ flexDirection: 'row' }}>{menu}</View>;
}
