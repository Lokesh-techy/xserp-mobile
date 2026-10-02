/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import type { IconName } from './button';
import { PickerSheet, type PickerItem } from './picker-sheet';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Props = {
  label: string;
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  icon?: IconName;
  required?: boolean;
  error?: string;
  placeholder?: string;
};

/** A form dropdown: label (✱ when required), selected name over its detail, ✕ to clear, inline error. */
export function SelectField({ label, items, value, onChange, icon = 'chevron-down', required, error, placeholder }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const picked = items.find((i) => i.id === value);
  return (
    <View style={styles.root}>
      <Text variant="label" color={t.colors.textMuted}>
        {label}
        {required && <Text variant="label" color={t.colors.danger}> ✱</Text>}
      </Text>
      <PressableScale onPress={() => setOpen(true)} scaleTo={0.99} style={[styles.box, !!error && { borderColor: t.colors.danger }]} accessibilityLabel={`${label}${picked ? `, ${picked.label}` : ', not selected'}`}>
        <View style={styles.text}>
          <Text variant="label" weight={picked ? 'semibold' : 'medium'} color={picked ? t.colors.text : t.colors.textFaint} numberOfLines={1}>
            {picked?.label ?? placeholder ?? `Choose ${label.toLowerCase()}`}
          </Text>
          {!!picked?.sublabel && (
            <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
              {picked.sublabel}
            </Text>
          )}
        </View>
        {picked ? (
          <Pressable hitSlop={12} onPress={() => onChange('')} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={20} color={t.colors.textFaint} />
          </Pressable>
        ) : (
          <Ionicons name={icon} size={18} color={t.colors.textFaint} />
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
  box: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.fillSubtle, paddingHorizontal: 16, paddingVertical: 8 },
  text: { flex: 1, gap: 2 },
}));
