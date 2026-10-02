/** @author Lokesh */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/core/theme';
import { Button, Text } from '@/ui';

import type { ApprovalAction } from './types';

type Props<T> = { actions: ApprovalAction<T>[]; canAct: boolean; busy: boolean; onPick: (a: ApprovalAction<T>) => void };

/** Sticky bottom bar with the actions allowed for the document on screen. */
export function ActionBar<T>({ actions, canAct, busy, onPick }: Props<T>) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!canAct || actions.length === 0) {
    if (canAct) return null;
    return (
      <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
        <Text variant="caption" color={t.colors.textMuted} style={styles.center}>
          You can view this document but not act on it.
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.bar, styles.row, { paddingBottom: insets.bottom + 10 }]}>
      {actions.map((a) => (
        <Button key={a.id} title={a.label} icon={a.icon} variant={a.tone} size="sm" disabled={busy} onPress={() => onPick(a)} style={styles.flex} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 10, backgroundColor: t.colors.surface, borderTopWidth: 1, borderTopColor: t.colors.divider, ...t.shadow.lifted },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
}));
