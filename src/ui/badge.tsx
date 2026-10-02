/** @author Lokesh */
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

export function Badge({
  count,
  tone = 'danger',
  style,
}: {
  count: number;
  tone?: 'danger' | 'primary';
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const styles = useStyles();
  if (!count || count < 1) return null;
  return (
    <View style={[styles.badge, { backgroundColor: tone === 'danger' ? t.colors.danger : t.colors.primary }, style]}>
      <Text variant="caption" weight="extrabold" color={t.colors.white} style={styles.text}>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
  text: { fontSize: 10, lineHeight: 13 },
}));
