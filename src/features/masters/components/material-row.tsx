/** @author Lokesh */
import { memo } from 'react';
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme, type Tone } from '@/core/theme';
import type { MaterialName } from '@/features/master-data';
import { ListRow, Text, TrailingTag, type RowEdge } from '@/ui';

type Props = { material: MaterialName; edge: RowEdge; onOpen: (material: MaterialName) => void };

/** Name; drawing no · make; a quiet HSN line; stock flags as pills; the unit in its aligned column. */
export const MaterialRow = memo(function MaterialRow({ material: m, edge, onOpen }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const detail = [m.drawingNo, m.makeName !== '-NA-' ? m.makeName : null].filter(Boolean).join(' · ');
  return (
    <ListRow edge={edge} onPress={() => onOpen(m)} style={styles.row} accessibilityLabel={m.name}>
      <View style={styles.text}>
        <Text variant="rowTitle" numberOfLines={2}>
          {m.name}
        </Text>
        {!!detail && (
          <Text variant="rowMeta" color={t.colors.textMuted} numberOfLines={1}>
            {detail}
          </Text>
        )}
        {!!m.hsnCode && (
          <Text variant="caption" color={t.colors.textFaint} numberOfLines={1}>
            HSN {m.hsnCode}
          </Text>
        )}
        {(!m.isStocked || m.isFaulty) && (
          <View style={styles.pills}>
            {!m.isStocked && <Flag label="Non-stock" tone="neutral" />}
            {m.isFaulty && <Flag label="Faulty" tone="danger" />}
          </View>
        )}
      </View>
      <TrailingTag value={m.unit || undefined} />
    </ListRow>
  );
});

/** A compact tinted tag — StatusPill's colours without its dot, so it sits quietly under the text. */
function Flag({ label, tone }: { label: string; tone: Tone }) {
  const t = useTheme();
  const styles = useStyles();
  const c = toneColors(t, tone);
  return (
    <View style={[styles.flag, { backgroundColor: c.bg }]}>
      <Text variant="caption" weight="bold" color={c.fg} style={styles.flagText}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  text: { flex: 1, gap: 3 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 4 },
  flag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: t.radius.pill },
  flagText: { fontSize: 11, lineHeight: 15 },
}));
