/** @author Lokesh */
import { useState } from 'react';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { PickerSheet, PressableScale, Text, type PickerItem } from '@/ui';

type Props = { label: string; items: PickerItem[]; value: string; onChange: (id: string) => void; error?: string };

/** Labelled field that opens a searchable picker. */
export function PickField({ label, items, value, onChange, error }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const picked = items.find((i) => i.id === value);
  return (
    <View style={styles.root}>
      <Text variant="label" color={t.colors.textMuted}>
        {label}
      </Text>
      <PressableScale onPress={() => setOpen(true)} style={[styles.box, !!error && { borderColor: t.colors.danger }]}>
        <Text variant="label" color={picked ? t.colors.text : t.colors.textFaint} numberOfLines={1}>
          {picked?.label ?? `Choose ${label.toLowerCase()}`}
        </Text>
        {!!picked?.sublabel && (
          <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
            {picked.sublabel}
          </Text>
        )}
      </PressableScale>
      {!!error && (
        <Text variant="caption" color={t.colors.danger}>
          {error}
        </Text>
      )}
      <PickerSheet visible={open} title={label} items={items} selectedId={value} allowClear={false} onSelect={(i) => i && onChange(i.id)} onClose={() => setOpen(false)} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: 8 },
  box: { minHeight: 54, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.fillSubtle, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8 },
}));
