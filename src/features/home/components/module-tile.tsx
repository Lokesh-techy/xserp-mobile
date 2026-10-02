/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter, makeStyles, useTheme } from '@/core/theme';
import { Badge, PressableScale, Text, type IconName } from '@/ui';

export type TileProps = { title: string; subtitle: string; icon: IconName; tint: string; access: 'open' | 'locked' | 'soon'; badge: number; index: number; onPress: () => void };

const ICON = 58;

/** A module as an app icon: tinted squircle, label below, badge on the corner. */
export function ModuleTile({ title, subtitle, icon, tint, access, badge, index, onPress }: TileProps) {
  const t = useTheme();
  const styles = useStyles();
  const locked = access !== 'open';
  return (
    <Animated.View entering={enter(60 + index * 30)} style={styles.cell}>
      <PressableScale
        onPress={onPress}
        disabled={access === 'locked'}
        scaleTo={0.9}
        style={[styles.press, locked && styles.locked]}
        accessibilityLabel={`${title}, ${subtitle}${access === 'locked' ? ', no access' : ''}${badge ? `, ${badge} pending` : ''}`}>
        <LinearGradient colors={[tint, shade(tint)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
          <View style={styles.sheen} />
          <Ionicons name={icon} size={26} color={t.colors.white} />
          {access === 'locked' && (
            <View style={styles.lock}>
              <Ionicons name="lock-closed" size={10} color={t.colors.white} />
            </View>
          )}
        </LinearGradient>
        {access === 'open' && <Badge count={badge} style={styles.badge} />}
        <Text variant="caption" weight="semibold" numberOfLines={1} style={styles.label}>
          {title}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

/** A slightly deeper version of the tint for the icon gradient. */
function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * 0.78));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
}

const useStyles = makeStyles((t) => ({
  cell: { width: '25%', alignItems: 'center', marginBottom: 18 },
  press: { alignItems: 'center', width: ICON + 18 },
  locked: { opacity: 0.45 },
  icon: { width: ICON, height: ICON, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...t.shadow.card },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: ICON / 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  lock: { position: 'absolute', right: 5, bottom: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, right: 2 },
  label: { marginTop: 7, textAlign: 'center' },
}));
