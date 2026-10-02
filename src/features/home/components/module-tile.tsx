/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter, makeStyles, useTheme } from '@/core/theme';
import { Badge, PressableScale, Text, type IconName } from '@/ui';

export type TileProps = { title: string; subtitle: string; icon: IconName; tint: string; access: 'open' | 'locked' | 'soon'; badge: number; index: number; onPress: () => void };

export function ModuleTile({ title, subtitle, icon, tint, access, badge, index, onPress }: TileProps) {
  const t = useTheme();
  const styles = useStyles();
  const muted = access !== 'open';
  return (
    <Animated.View entering={enter(60 + index * 40)} style={styles.cell}>
      <PressableScale onPress={onPress} disabled={access === 'locked'} style={[styles.tile, muted && styles.muted]} accessibilityLabel={`${title}${access === 'locked' ? ', no access' : access === 'soon' ? ', coming soon' : ''}`}>
        <View style={[styles.glow, { backgroundColor: tint }]} />
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: `${tint}18` }]}>
            <Ionicons name={icon} size={24} color={tint} />
          </View>
          {access === 'open' && <Badge count={badge} />}
          {access === 'locked' && <Ionicons name="lock-closed" size={16} color={t.colors.textFaint} />}
          {access === 'soon' && (
            <View style={styles.soon}>
              <Text variant="overline" color={t.colors.textMuted}>
                Soon
              </Text>
            </View>
          )}
        </View>
        <View style={styles.bottom}>
          <Text variant="title" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color={t.colors.textMuted} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {access === 'open' && (
          <View style={[styles.arrow, { backgroundColor: tint }]}>
            <Ionicons name="arrow-forward" size={14} color={t.colors.white} />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  cell: { width: '48.2%' },
  tile: { height: 168, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, overflow: 'hidden', justifyContent: 'space-between', ...t.shadow.card },
  muted: { opacity: 0.6 },
  glow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, top: -30, right: -30, opacity: 0.07 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  soon: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: t.radius.pill, backgroundColor: t.colors.fill },
  bottom: { gap: 2, paddingRight: 28 },
  title: { fontSize: 19 },
  arrow: { position: 'absolute', right: 14, bottom: 14, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
}));
