/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';
import { AURORA_TINT_COUNT, AuroraBackdrop, Bone, CountUp, PressableScale, Text } from '@/ui';

import { selectionTotal, toggleType } from '../selection';
import { ReviewButton } from './review-button';

/**
 * `direct` groups (e.g. expense claims) open their own screen instead of joining a review.
 * `value` is the rupee total waiting; `foreign` marks foreign-currency documents left out of it.
 */
export type ApprovalGroup = {
  key: string;
  label: string;
  tint: string;
  count: number;
  value?: number;
  foreign?: boolean;
  direct?: () => void;
};

type Props = { groups: ApprovalGroup[]; loading: boolean; syncing: boolean; onReview: (types: string[]) => void };

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

/** The three biggest types' colours, largest first (the brand blues when there's nothing to weigh). */
const leadingTints = (groups: ApprovalGroup[]) =>
  [...groups].sort((a, b) => b.count - a.count).slice(0, AURORA_TINT_COUNT).map((g) => g.tint);

/**
 * Approvals at a glance: the total, then a fixed grid of document types.
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
      <Animated.View style={[styles.card, styles.glow, styles.clear]}>
        <AuroraBackdrop tints={[t.colors.success, t.colors.accent, t.colors.success]} />
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
    <Animated.View style={[styles.card, styles.glow]}>
      <AuroraBackdrop tints={leadingTints(groups)} />
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
        <ReviewButton label={live.length ? `Review ${compact(reviewCount)}` : 'Review all'} ready={!loading} onPress={() => onReview(live)} />
      </View>


      <View style={styles.grid}>
        {groups.map((g) => {
          const on = live.includes(g.key);
          return (
            <View key={g.key} style={styles.cell}>
              <PressableScale
                onPress={() => (g.direct ? g.direct() : setSelected((s) => toggleType(s, g.key)))}
                style={[styles.tile, on && { backgroundColor: `${g.tint}1F`, borderColor: g.tint }]}
                scaleTo={0.95}
                accessibilityRole={g.direct ? 'button' : 'checkbox'}
                accessibilityState={g.direct ? undefined : { checked: on }}
                accessibilityLabel={`${g.count} ${g.label}`}>
                <View style={styles.tileTop}>
                  <Text variant="body" weight={on ? 'bold' : 'semibold'} numberOfLines={1} style={styles.flexText}>
                    {g.label}
                  </Text>
                  {on && <Ionicons name="checkmark-circle" size={16} color={g.tint} />}
                  {!!g.direct && <Ionicons name="arrow-forward" size={14} color={t.colors.textFaint} />}
                </View>
                <Animated.View entering={FadeIn.duration(300)} style={styles.tileBottom}>
                  <CountUp value={g.count} format={compact} variant="title" style={styles.tileCount} />
                  {!!g.value && (
                    <Text variant="caption" weight="semibold" color={t.colors.textMuted} numberOfLines={1} style={styles.tileValue}>
                      {formatCompact(g.value)}
                      {g.foreign ? '+' : ''}
                    </Text>
                  )}
                </Animated.View>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, ...t.shadow.card },
  // A soft brand-blue halo and a blue-tinted hairline: the one card on Home that glows.
  glow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.dark ? 'rgba(91,155,255,0.28)' : 'rgba(0,65,149,0.10)',
    shadowColor: t.dark ? '#209BE1' : '#004195',
    shadowOpacity: t.dark ? 0.22 : 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  total: { fontSize: 36, lineHeight: 42, letterSpacing: -1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginHorizontal: -4 },
  // Fixed thirds: counts changing width can never reflow the grid.
  cell: { width: '33.333%', padding: 4 },
  // Frosted tiles: translucent over the card's aurora, defined by a hairline rather than a fill.
  tile: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: t.colors.edgeLight,
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Only the headline total is bold; tile counts are plain figures under the name.
  tileCount: { fontSize: 20, lineHeight: 26, fontFamily: t.fonts.medium, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  flexText: { flex: 1 },
  tileBottom: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 2 },
  tileValue: { flexShrink: 1, fontVariant: ['tabular-nums'] },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clearIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
}));
