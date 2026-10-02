/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { enter, makeStyles, useTheme } from '@/core/theme';
import { Bone, PressableScale, Text } from '@/ui';

export type ApprovalGroup = { key: string; label: string; tint: string; count: number };

type Props = { groups: ApprovalGroup[]; loading: boolean; onReview: (key: string | null) => void };

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

/**
 * Approvals at a glance: one total, a composition bar split by document type, and a chip per type.
 * Tap a chip to review just that type, or "Review" to work through everything.
 */
export function ApprovalsCard({ groups, loading, onReview }: Props) {
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
            Nothing is waiting for your approval.
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={enter(40)} layout={LinearTransition} style={styles.card}>
      <View style={styles.head}>
        <Text variant="overline" color={t.colors.textMuted}>
          Approvals
        </Text>
        <PressableScale onPress={() => onReview(null)} style={styles.review} accessibilityLabel={`Review all ${total} approvals`}>
          <Text variant="label" weight="bold" color={t.colors.accent}>
            Review
          </Text>
          <Ionicons name="arrow-forward" size={14} color={t.colors.accent} />
        </PressableScale>
      </View>

      <View style={styles.totalRow}>
        <Text variant="display" style={styles.total}>
          {compact(total)}
        </Text>
        <Text variant="body" color={t.colors.textMuted}>
          waiting for you
        </Text>
      </View>

      <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {groups.map((g) => (
          <Animated.View key={g.key} entering={FadeIn.duration(400)} layout={LinearTransition} style={[styles.segment, { flex: g.count, backgroundColor: g.tint }]} />
        ))}
      </View>

      <View style={styles.chips}>
        {groups.map((g) => (
          <PressableScale key={g.key} onPress={() => onReview(g.key)} style={styles.chip} scaleTo={0.95} accessibilityLabel={`${g.count} ${g.label}`}>
            <View style={[styles.dot, { backgroundColor: g.tint }]} />
            <Text variant="label" color={t.colors.textMuted}>
              {g.label}
            </Text>
            <Text variant="label" weight="extrabold">
              {compact(g.count)}
            </Text>
          </PressableScale>
        ))}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, ...t.shadow.card },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  review: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingLeft: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  total: { fontSize: 32, lineHeight: 38 },
  bar: { flexDirection: 'row', height: 8, borderRadius: t.radius.pill, overflow: 'hidden', gap: 2, marginTop: 10, backgroundColor: t.colors.fill },
  segment: { height: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: t.radius.pill, backgroundColor: t.colors.fill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clearIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
}));
