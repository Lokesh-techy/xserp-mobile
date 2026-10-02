/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { enter, makeStyles, useTheme } from '@/core/theme';
import { Bone, CountUp, PressableScale, Text } from '@/ui';

export type ApprovalGroup = { key: string; label: string; tint: string; count: number };

type Props = { groups: ApprovalGroup[]; loading: boolean; syncing: boolean; onReview: (key: string | null) => void };

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

/** Light sweeping across the composition bar while a sync is running — no layout change. */
function SyncSweep({ active }: { active: boolean }) {
  const t = useTheme();
  const x = useSharedValue(-1);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (active) x.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false));
    else {
      cancelAnimation(x);
      x.set(-1);
    }
  }, [active, x]);
  const style = useAnimatedStyle(() => ({ opacity: active ? 1 : 0, transform: [{ translateX: x.get() * width }] }));
  return (
    <Animated.View pointerEvents="none" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient colors={['transparent', t.dark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/**
 * Approvals at a glance: total, a composition bar by document type, and a fixed grid of types.
 * Order and layout never change on refresh — only the numbers glide to their new values.
 */
export function ApprovalsCard({ groups, loading, syncing, onReview }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const total = groups.reduce((n, g) => n + g.count, 0);

  if (loading && total === 0) {
    return (
      <View style={styles.card}>
        <Bone style={{ width: 90, height: 11 }} />
        <Bone style={{ width: 140, height: 28, marginTop: 10 }} />
        <Bone style={{ width: '100%', height: 8, marginTop: 14, borderRadius: 999 }} />
      </View>
    );
  }

  if (total === 0) {
    return (
      <Animated.View entering={enter(40)} style={[styles.card, styles.clear]}>
        <View style={styles.clearIcon}>
          <Ionicons name="checkmark-done" size={20} color={t.colors.success} />
        </View>
        <View style={styles.flex}>
          <Text variant="heading">All clear</Text>
          <Text variant="caption" color={t.colors.textMuted}>
            {syncing ? 'Updating…' : 'Nothing is waiting for your approval.'}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={enter(40)} style={styles.card}>
      <PressableScale onPress={() => onReview(null)} style={styles.head} scaleTo={0.98} accessibilityLabel={`Review all ${total} approvals`}>
        <View>
          <Text variant="overline" color={t.colors.textMuted}>
            {syncing ? 'Approvals · updating…' : 'Approvals'}
          </Text>
          <View style={styles.totalRow}>
            <CountUp value={total} format={compact} variant="display" style={styles.total} />
            <Text variant="body" color={t.colors.textMuted}>
              waiting
            </Text>
          </View>
        </View>
        <View style={styles.reviewPill}>
          <Text variant="label" weight="bold" color={t.colors.white}>
            Review
          </Text>
          <Ionicons name="arrow-forward" size={14} color={t.colors.white} />
        </View>
      </PressableScale>

      <View style={styles.bar}>
        {groups.map((g) => (
          <View key={g.key} style={[styles.segment, { flex: g.count, backgroundColor: g.tint }]} />
        ))}
        <SyncSweep active={syncing} />
      </View>

      <View style={styles.grid}>
        {groups.map((g) => (
          <PressableScale key={g.key} onPress={() => onReview(g.key)} style={styles.cell} scaleTo={0.95} accessibilityLabel={`${g.count} ${g.label}`}>
            <View style={styles.cellTop}>
              <View style={[styles.dot, { backgroundColor: g.tint }]} />
              <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                {g.label}
              </Text>
            </View>
            <Animated.View entering={FadeIn.duration(300)}>
              <CountUp value={g.count} format={compact} variant="heading" style={styles.cellCount} />
            </Animated.View>
          </PressableScale>
        ))}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, ...t.shadow.card },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  total: { fontSize: 32, lineHeight: 38 },
  reviewPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 16, borderRadius: t.radius.pill, backgroundColor: t.colors.primary },
  bar: { flexDirection: 'row', height: 8, borderRadius: t.radius.pill, overflow: 'hidden', gap: 2, marginTop: 12, backgroundColor: t.colors.fill },
  segment: { height: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginHorizontal: -4 },
  // Fixed thirds: counts changing width can never reflow the grid.
  cell: { width: '33.333%', paddingHorizontal: 4, paddingVertical: 8, borderRadius: t.radius.sm },
  cellTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellCount: { marginTop: 2, marginLeft: 14, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clearIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
}));
