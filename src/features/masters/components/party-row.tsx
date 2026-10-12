/** @author Lokesh */
import { memo } from 'react';
import { Platform, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import type { Party } from '@/features/master-data';
import { ListRow, Text, type RowEdge } from '@/ui';

import { letterOf } from '../group-by-letter';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** A stable pick from the theme's chart hues, so a party keeps its colour everywhere. */
function tintOf(name: string, hues: readonly string[]): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return hues[Math.abs(h) % hues.length]!;
}

type Props = { party: Party; edge: RowEdge; onOpen: (party: Party) => void };

/** Initial avatar, the name, and the party code as a small mono chip. */
export const PartyRow = memo(function PartyRow({ party, edge, onOpen }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const tint = tintOf(party.name, t.chart);
  const letter = letterOf(party.name);
  return (
    <ListRow
      edge={edge}
      onPress={() => onOpen(party)}
      dividerInset={68}
      style={styles.row}
      accessibilityLabel={`${party.name}, code ${party.code}`}>
      <View style={[styles.avatar, { backgroundColor: `${tint}1F` }]}>
        <Text variant="heading" color={tint}>
          {letter === '#' ? party.name.trim().charAt(0) || '#' : letter}
        </Text>
      </View>
      <View style={styles.text}>
        <Text variant="rowTitle" numberOfLines={2}>
          {party.name}
        </Text>
        {!!party.code && (
          <View style={styles.chip}>
            <Text variant="caption" color={t.colors.textMuted} numberOfLines={1} style={styles.mono}>
              {party.code}
            </Text>
          </View>
        )}
      </View>
    </ListRow>
  );
});

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 6, alignItems: 'flex-start' },
  chip: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: t.colors.fill },
  mono: { fontFamily: MONO, fontSize: 11, letterSpacing: 0.2 },
}));
