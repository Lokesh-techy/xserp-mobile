/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { Bone, Button, CountUp, PressableScale, Text, withPressFeel } from '@/ui';

import { selectionTotal, toggleType } from '../selection';

/** `direct` groups (e.g. expense claims) open their own screen instead of joining a review. */
export type ApprovalGroup = { key: string; label: string; tint: string; count: number; direct?: () => void };

type Props = { groups: ApprovalGroup[]; loading: boolean; syncing: boolean; onReview: (types: string[]) => void };

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
  // Tap types to build the review: none selected = everything; any combination otherwise.
  const [selected, setSelected] = useState<string[]>([]);
  const reviewable = groups.filter((g) => !g.direct);
  const live = selected.filter((k) => reviewable.some((g) => g.key === k));
  const reviewCount = selectionTotal(reviewable, live);
  const isOn = (key: string) => live.length === 0 || live.includes(key);

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
      <Animated.View style={[styles.card, styles.clear]}>
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
    <Animated.View style={styles.card}>
      <View style={styles.head}>
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
        <Button
          title={live.length ? `Review ${compact(reviewCount)}` : 'Review all'}
          icon="arrow-forward"
          size="sm"
          onPress={withPressFeel(() => onReview(live))}
          style={styles.reviewButton}
        />
      </View>

      <View style={styles.bar}>
        {groups.map((g) => (
          <View key={g.key} style={[styles.segment, { flex: g.count, backgroundColor: g.tint, opacity: isOn(g.key) || g.direct ? 1 : 0.22 }]} />
        ))}
        <SyncSweep active={syncing} />
      </View>

      <View style={styles.grid}>
        {groups.map((g) => (
          <PressableScale
            key={g.key}
            onPress={() => (g.direct ? g.direct() : setSelected((s) => toggleType(s, g.key)))}
            style={[styles.cell, live.includes(g.key) && { backgroundColor: `${g.tint}1F` }]}
            scaleTo={0.95}
            accessibilityRole={g.direct ? 'button' : 'checkbox'}
            accessibilityState={g.direct ? undefined : { checked: live.includes(g.key) }}
            accessibilityLabel={`${g.count} ${g.label}`}>
            <View style={styles.cellTop}>
              <View style={[styles.dot, { backgroundColor: g.tint }]} />
              <Text variant="caption" color={live.includes(g.key) ? t.colors.text : t.colors.textMuted} weight={live.includes(g.key) ? 'bold' : undefined} numberOfLines={1}>
                {g.label}
              </Text>
              {live.includes(g.key) && <Ionicons name="checkmark-circle" size={14} color={g.tint} style={styles.check} />}
              {!!g.direct && <Ionicons name="open-outline" size={12} color={t.colors.textFaint} style={styles.check} />}
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
  reviewButton: { borderRadius: t.radius.pill, minWidth: 132 },
  bar: { flexDirection: 'row', height: 8, borderRadius: t.radius.pill, overflow: 'hidden', gap: 2, marginTop: 12, backgroundColor: t.colors.fill },
  segment: { height: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginHorizontal: -4 },
  // Fixed thirds: counts changing width can never reflow the grid.
  cell: { width: '33.333%', paddingHorizontal: 8, paddingVertical: 8, borderRadius: t.radius.sm },
  cellTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellCount: { marginTop: 2, marginLeft: 14, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  check: { marginLeft: 'auto' },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clearIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
}));
