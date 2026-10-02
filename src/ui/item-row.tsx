/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

/**
 * A pickable record: `label` is the name, `sublabel` the identifying detail (code, drawing no · make),
 * `trailing` a short value shown in its own right-aligned column (e.g. the unit) so rows line up.
 */
export type PickerItem = { id: string; label: string; sublabel?: string; trailing?: string };

/** Name over detail, the same in every dropdown and master list. */
export function ItemText({ item, selected }: { item: PickerItem; selected?: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.text}>
      <Text variant="rowTitle" weight={selected ? 'bold' : 'semibold'} numberOfLines={2}>
        {item.label}
      </Text>
      {!!item.sublabel && (
        <Text variant="rowMeta" color={t.colors.textMuted} numberOfLines={1}>
          {item.sublabel}
        </Text>
      )}
    </View>
  );
}

/** Fixed-width column for a short value like a unit, so it aligns down the list whatever the name length. */
export function TrailingTag({ value }: { value?: string }) {
  const t = useTheme();
  const styles = useStyles();
  if (!value) return null;
  return (
    <View style={styles.tagCol}>
      <View style={styles.tag}>
        <Text variant="caption" weight="bold" color={t.colors.textMuted} numberOfLines={1} style={styles.tagText}>
          {value.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  text: { flex: 1, gap: 2 },
  tagCol: { width: 52, alignItems: 'flex-end' },
  tag: { maxWidth: 52, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: t.colors.fill },
  tagText: { fontSize: 11, lineHeight: 15, letterSpacing: 0.3 },
}));
