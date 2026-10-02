/** @author Lokesh */
import { ScrollView } from 'react-native';

import { makeStyles } from '@/core/theme';
import { toApiDate, type DateRange } from '@/core/utils';

import { Chip } from './chip';
import { rangePresets } from './filter-sheet';

type Props = { value: DateRange; onChange: (r: DateRange) => void; fyStartDay?: string | null; nested?: object };

/** Horizontal preset chips (7d / 30d / month / FY) for dashboards. */
export function RangeChips({ value, onChange, fyStartDay, nested }: Props) {
  const styles = useStyles();
  const same = (r: DateRange) => toApiDate(r.since) === toApiDate(value.since) && toApiDate(r.till) === toApiDate(value.till);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} {...nested}>
      {rangePresets(fyStartDay).map((p) => (
        <Chip key={p.key} label={p.label} active={same(p.range)} onPress={() => onChange(p.range)} />
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({ row: { gap: 8, paddingVertical: 4 } }));
