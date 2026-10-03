/** @author Lokesh */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/core/theme';

import { PressableScale } from './pressable-scale';

/** Where a row sits in its panel: only the first and last round their outer corners. */
export type RowEdge = { first: boolean; last: boolean };

// Shared instances, so memoised rows see the same `edge` object across list rebuilds.
const EDGES: RowEdge[] = [
  { first: false, last: false },
  { first: true, last: false },
  { first: false, last: true },
  { first: true, last: true },
];

export const edgeOf = (index: number, count: number): RowEdge =>
  EDGES[(index === 0 ? 1 : 0) + (index === count - 1 ? 2 : 0)]!;

type Props = {
  children: ReactNode;
  /** Defaults to a standalone row (both edges). Pass `edgeOf(index, data.length)` from a list. */
  edge?: RowEdge;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Left offset of the divider, so it lines up with the text rather than a leading badge. */
  dividerInset?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * One row of a list. Consecutive rows join into a single panel separated by a quiet inset hairline —
 * calmer than a stack of shadowed cards and easier to scan. Presses dim instead of shrinking, so the panel never breaks.
 */
export function ListRow({
  children,
  edge = { first: true, last: true },
  onPress,
  onLongPress,
  dividerInset = 16,
  style,
  accessibilityLabel,
}: Props) {
  const styles = useStyles();
  const frame = [styles.row, edge.first && styles.first, edge.last && styles.last, style];
  const divider = !edge.last && <View pointerEvents="none" style={[styles.divider, { left: dividerInset }]} />;
  if (!onPress) {
    return (
      <View style={frame} accessibilityLabel={accessibilityLabel}>
        {children}
        {divider}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      scaleTo={1}
      style={frame}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      {children}
      {divider}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderColor: t.colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  first: {
    borderTopLeftRadius: t.radius.md,
    borderTopRightRadius: t.radius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // A breath of space under each panel, so stacked panels and footers never touch.
  last: {
    borderBottomLeftRadius: t.radius.md,
    borderBottomRightRadius: t.radius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  divider: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: t.colors.border,
  },
}));
