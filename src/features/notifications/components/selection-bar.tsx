/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/core/theme';
import { PressableScale, Text, type IconName } from '@/ui';

type Props = {
  count: number;
  allSelected: boolean;
  /** Any unread among the selection: the button marks read; otherwise it marks them unread again. */
  canMarkRead: boolean;
  onSelectAll: (on: boolean) => void;
  onMarkRead: () => void;
  onDelete: () => void;
};

/** Floating bar while selecting: select all, mark read (or unread), delete. */
export function SelectionBar({ count, allSelected, canMarkRead, onSelectAll, onMarkRead, onDelete }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const none = count === 0;
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      style={[styles.bar, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <Item
        icon={allSelected ? 'remove-circle-outline' : 'checkmark-circle-outline'}
        label={allSelected ? 'Clear' : 'Select all'}
        onPress={() => onSelectAll(!allSelected)}
      />
      <View style={styles.sep} />
      <Item
        icon={canMarkRead || none ? 'mail-open-outline' : 'mail-unread-outline'}
        label={canMarkRead || none ? 'Mark read' : 'Mark unread'}
        disabled={none}
        onPress={onMarkRead}
      />
      <Item icon="trash-outline" label="Delete" color={t.colors.danger} disabled={none} onPress={onDelete} />
    </Animated.View>
  );
}

function Item({
  icon,
  label,
  onPress,
  disabled,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const fg = color ?? t.colors.text;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.94}
      style={[styles.item, disabled && styles.off]}
      accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={fg} />
      <Text variant="caption" weight="semibold" color={fg}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    position: 'absolute',
    left: t.space.gutter,
    right: t.space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    ...t.shadow.lifted,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6, borderRadius: t.radius.sm },
  off: { opacity: 0.35 },
  sep: { width: 1, height: 28, backgroundColor: t.colors.border },
}));
