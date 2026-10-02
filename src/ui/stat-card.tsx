/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme, type Tone } from '@/core/theme';

import type { IconName } from './button';
import { Card } from './card';
import { Text } from './text';

type Props = { label: string; value: string; icon?: IconName; tone?: Tone; caption?: string; onPress?: () => void };

export function StatCard({ label, value, icon, tone = 'info', caption, onPress }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const c = toneColors(t, tone);
  return (
    <Card style={styles.card} onPress={onPress}>
      {icon && (
        <View style={[styles.icon, { backgroundColor: c.bg }]}>
          <Ionicons name={icon} size={18} color={c.fg} />
        </View>
      )}
      <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="heading" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!caption && (
        <Text variant="caption" color={c.fg} numberOfLines={1}>
          {caption}
        </Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { flex: 1, minWidth: '46%', gap: 4, padding: 14 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  value: { fontSize: 18, lineHeight: 24 },
}));
