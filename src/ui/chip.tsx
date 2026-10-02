/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, useTheme } from '@/core/theme';

import type { IconName } from './button';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Props = { label: string; active?: boolean; onPress: () => void; icon?: IconName; tone?: 'default' | 'warning' };

export function Chip({ label, active, onPress, icon, tone = 'default' }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const warn = tone === 'warning';
  const bg = active ? (warn ? t.colors.warning : t.colors.primarySoft) : warn ? t.colors.warningSoft : t.colors.fill;
  const fg = active
    ? warn
      ? t.colors.white
      : t.colors.onPrimarySoft
    : warn
      ? t.colors.warningText
      : t.colors.textMuted;
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg }, active && !warn && styles.activeBorder]}>
      {icon && <Ionicons name={icon} size={14} color={fg} />}
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: t.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeBorder: { borderColor: t.colors.chipBorder },
}));
