/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';

import { usePlacement } from './header-slot';
import { MenuButton } from './menu-button';

export type TypeOption = { key: string; label: string; tint: string; count: number };

type Props = {
  options: TypeOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** In the header bar rather than its own row. */ inHeader?: boolean;
};

/** Document types to include, as one menu ("All types ⌄" / "PO, GRN ⌄") with counts and colour dots. */
export function TypeFilterBar({ options, selected, onChange, inHeader: forced }: Props) {
  const inHeader = !!usePlacement() || !!forced;
  const styles = useStyles();
  const total = options.reduce((n, o) => n + o.count, 0);
  const menu = (
    <MenuButton
      title="Document types"
      icon="layers-outline"
      multiple
      appearance={inHeader ? 'header' : 'field'}
      allLabel={inHeader ? `All · ${total}` : `All types · ${total}`}
      options={options.map((o) => ({ key: o.key, label: o.label, detail: String(o.count), dot: o.tint }))}
      values={selected}
      onChangeMany={(keys) => onChange(keys.length === options.length ? [] : keys)}
    />
  );
  return inHeader ? menu : <View style={styles.row}>{menu}</View>;
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', paddingHorizontal: t.space.gutter, paddingVertical: 10 },
}));
