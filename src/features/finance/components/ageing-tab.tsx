/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { errorMessage } from '@/core/api';
import type { Aging } from '@/core/erp';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact, formatDate, formatMoney, parseServerDate } from '@/core/utils';
import { AuroraBackdrop, Card, CountUp, QueryState, Text, toast, useHostRefresh, type ScrollHost } from '@/ui';

import { fetchAgeing, fetchAgeingSideData, type AgeingData } from '../api';
import {
  AGE_BUCKETS,
  bucketAmount,
  bucketLabel,
  bucketParam,
  OTHER_BUCKETS,
  type AgeingScope,
  type Bucket,
} from '../buckets';
import { freshness } from '../freshness';
import type { FinanceSide } from '../dashboard-model';
import { financeKeys } from '../keys';

// Fresh money calm, old money alarming: one hue per age bucket, green through to deep red.
const AGE_COLOR: Record<string, string> = {
  age1: '#2BAE73',
  age2: '#86B83A',
  age3: '#E3B23C',
  age4: '#E8893A',
  age5: '#DC5A3C',
  age6: '#B3261E',
};

const openBucket = (receivable: boolean, scope: AgeingScope, b: Bucket) =>
  router.push({ pathname: '/finance/aging/[bucket]', params: { bucket: bucketParam(receivable, scope, b.key) } });

/** `side` opens on that side (from the dashboard's tiles); Receivables otherwise. */
export function AgeingTab({ host, side: initialSide }: { host: ScrollHost; side?: FinanceSide }) {
  const t = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();
  const [receivable, setReceivable] = useState(initialSide !== 'payable');
  const [scope, setScope] = useState<AgeingScope>('trade');
  const query = useQuery({ queryKey: financeKeys.ageing(), queryFn: fetchAgeing });
  // Coming back to the tab re-reads the saved figures (cheap); pulling recomputes them on the server.
  const reread = useCallback(() => query.refetch(), [query]);
  useFocusRefetch(reread);
  // Pulling recomputes only the side on screen, in the background; the pull lets go at once and the ring
  // spins until that side's figures land.
  const live = useMutation({
    mutationFn: (side: boolean) => fetchAgeingSideData(side, true),
    onSuccess: (data, side) =>
      qc.setQueryData<AgeingData>(
        financeKeys.ageing(),
        (old) => old && { ...old, [side ? 'receivable' : 'payable']: data },
      ),
    onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
  });
  const { isPending, variables, mutate: startLive } = live;
  const computing = isPending && variables === receivable;
  const recompute = useCallback(() => {
    if (!isPending) startLive(receivable);
    return Promise.resolve();
  }, [isPending, startLive, receivable]);
  useHostRefresh(host, recompute, 'RECOMPUTING AGEING…');

  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>
        {(d) => {
          const side = receivable ? d.receivable : d.payable;
          const a = side[scope];
          return (
            <>
              <SummaryCard
                a={a}
                receivable={receivable}
                scope={scope}
                computedAt={side.computedAt}
                computing={computing}
                onSide={setReceivable}
                onScope={setScope}
              />
              {a ? (
                <>
                  <AgeBreakdown a={a} receivable={receivable} scope={scope} />
                  <Unmatched a={a} receivable={receivable} scope={scope} />
                </>
              ) : (
                <Text variant="body" color={t.colors.textMuted} style={styles.center}>
                  Nothing computed for this section yet. Pull down to compute it.
                </Text>
              )}
            </>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

type SummaryProps = {
  a: Aging | null;
  receivable: boolean;
  scope: AgeingScope;
  computedAt: string | null;
  computing: boolean;
  onSide: (receivable: boolean) => void;
  onScope: (scope: AgeingScope) => void;
};

// Each side's ink (labels, underline, halo) and its aurora: emerald for money coming in, crimson going out.
const SIDE = {
  receivable: { ink: '#0F8A66', inkDark: '#3CC79A', aurora: ['#10B981', '#0EA5A4', '#34D399'] },
  payable: { ink: '#B4323F', inkDark: '#F07B77', aurora: ['#E11D48', '#F97316', '#BE123C'] },
} as const;

/** The section's headline, styled like Home's approvals card: a light card lit by its side's colours. */
function SummaryCard({ a, receivable, scope, computedAt, computing, onSide, onScope }: SummaryProps) {
  const t = useTheme();
  const styles = useStyles();
  const side = SIDE[receivable ? 'receivable' : 'payable'];
  const ink = t.dark ? side.inkDark : side.ink;
  return (
    <View style={[styles.summary, { shadowColor: ink, borderColor: `${ink}33` }]}>
      <Animated.View
        key={receivable ? 'r' : 'p'}
        entering={FadeIn.duration(220)}
        style={styles.aurora}
        pointerEvents="none">
        <AuroraBackdrop tints={[...side.aurora]} />
      </Animated.View>
      <View style={styles.topRow}>
        <View style={styles.sides}>
          <SideWord label="Receivables" active={receivable} ink={ink} onPress={() => onSide(true)} />
          <SideWord label="Payables" active={!receivable} ink={ink} onPress={() => onSide(false)} />
        </View>
        <FreshnessRing computedAt={computedAt} computing={computing} ink={ink} />
      </View>
      <View style={styles.scopes}>
        <ScopePill
          label={receivable ? 'Customers' : 'Suppliers'}
          active={scope === 'trade'}
          onPress={() => onScope('trade')}
        />
        <ScopePill label="Others" active={scope === 'others'} onPress={() => onScope('others')} />
      </View>
      <Text variant="overline" color={t.colors.textMuted} style={styles.totalLabel}>
        Total due
      </Text>
      {a ? (
        <CountUp value={a.total} format={formatMoney} variant="display" style={styles.total} />
      ) : (
        <Text variant="display" style={styles.total}>
          —
        </Text>
      )}
      <View style={styles.pair}>
        <Chip label="Overdue" value={a?.overdue} dot={t.colors.danger} />
        <Chip label="Due in 10 days" value={a?.age7} dot={t.colors.warning} />
      </View>
    </View>
  );
}

function SideWord({
  label,
  active,
  ink,
  onPress,
}: {
  label: string;
  active: boolean;
  ink: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Text variant="heading" weight={active ? 'bold' : 'medium'} color={active ? ink : t.colors.textFaint}>
        {label}
      </Text>
      <View style={[styles.underline, { backgroundColor: ink }, !active && styles.hidden]} />
    </Pressable>
  );
}

function ScopePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[styles.pill, active && styles.pillOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}>
      <Text variant="caption" weight={active ? 'bold' : 'medium'} color={active ? t.colors.text : t.colors.textMuted}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A frosted tile like Home's: translucent over the aurora, defined by a hairline. */
function Chip({ label, value, dot }: { label: string; value: number | undefined; dot: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.chip}>
      <View style={styles.chipHead}>
        <View style={[styles.chipDot, { backgroundColor: dot }]} />
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="title" style={styles.chipValue}>
        {value === undefined ? '—' : formatCompact(value)}
      </Text>
    </View>
  );
}

const R = 11;
const C = 2 * Math.PI * R;

/** An arc that drains as the figures age (empty after a day), green → amber → red; tap for the exact time. */
function FreshnessRing({ computedAt, computing, ink }: { computedAt: string | null; computing: boolean; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  const at = parseServerDate(computedAt);
  const f = freshness(at);
  const color = f.level === 'fresh' ? t.colors.success : f.level === 'aging' ? t.colors.warning : t.colors.danger;
  const spin = useSharedValue(0);
  useEffect(() => {
    if (computing) spin.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false));
    else {
      cancelAnimation(spin);
      spin.set(0);
    }
  }, [computing, spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  const explain = () =>
    toast.show({
      message: computing
        ? 'Recomputing ageing on the server — the figures update when it finishes'
        : at
          ? `Computed ${formatDate(computedAt!, 'dd MMM, HH:mm')} · pull down to recompute`
          : 'Not computed yet · pull down to compute',
      tone: 'info',
    });
  return (
    <Pressable
      onPress={explain}
      hitSlop={10}
      style={styles.ring}
      accessibilityLabel={computing ? 'Recomputing ageing' : `Ageing computed ${f.short} ago`}>
      <Animated.View style={computing ? spinStyle : undefined}>
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Circle cx={14} cy={14} r={R} stroke={t.colors.fill} strokeWidth={3} fill="none" />
          <Circle
            cx={14}
            cy={14}
            r={R}
            stroke={computing ? ink : color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={computing ? `${C * 0.25} ${C}` : `${C * f.fill} ${C}`}
            transform="rotate(-90 14 14)"
          />
        </Svg>
      </Animated.View>
      <Text variant="caption" weight="bold" color={t.colors.textMuted} style={styles.ringText}>
        {computing ? '…' : f.short}
      </Text>
    </Pressable>
  );
}

type SectionProps = { a: Aging; receivable: boolean; scope: AgeingScope };

/** The six age buckets as one bar (each segment its share) over aligned rows: amount, share, drill-in. */
const AgeBreakdown = memo(function AgeBreakdown({ a, receivable, scope }: SectionProps) {
  const t = useTheme();
  const styles = useStyles();
  const amounts = AGE_BUCKETS.map((b) => bucketAmount(a, b.key));
  const billed = amounts.reduce((n, v) => n + v, 0);
  return (
    <Card style={styles.breakdown}>
      <View style={styles.breakdownHead}>
        <Text variant="label">By age of bill</Text>
        <Text variant="caption" color={t.colors.textMuted} style={styles.num}>
          {formatCompact(billed)}
        </Text>
      </View>
      <View style={styles.bar}>
        {AGE_BUCKETS.map((b, i) =>
          amounts[i]! > 0 ? <View key={b.key} style={{ flex: amounts[i], backgroundColor: AGE_COLOR[b.key] }} /> : null,
        )}
      </View>
      {AGE_BUCKETS.map((b, i) => {
        const amount = amounts[i]!;
        const empty = amount === 0;
        return (
          <Pressable
            key={b.key}
            disabled={empty}
            onPress={() => openBucket(receivable, scope, b)}
            style={({ pressed }) => [styles.ageRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${b.label}, ${formatMoney(amount)}`}>
            <View style={[styles.dot, { backgroundColor: empty ? t.colors.fill : AGE_COLOR[b.key] }]} />
            <Text variant="body" color={empty ? t.colors.textFaint : t.colors.text} style={styles.flex}>
              {b.label}
            </Text>
            <Text variant="caption" color={t.colors.textFaint} style={[styles.num, styles.pct]}>
              {billed > 0 && !empty ? `${Math.round((amount / billed) * 100)}%` : ''}
            </Text>
            <Text
              variant="label"
              weight="bold"
              color={empty ? t.colors.textFaint : t.colors.text}
              style={[styles.num, styles.amount]}>
              {formatCompact(amount)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={empty ? 'transparent' : t.colors.textFaint} />
          </Pressable>
        );
      })}
    </Card>
  );
});

/** Advances, un-billed and excess side by side — money not yet matched to a bill. */
const Unmatched = memo(function Unmatched({ a, receivable, scope }: SectionProps) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Card style={styles.unmatched}>
      <Text variant="label">Not matched to bills</Text>
      <View style={styles.unmatchedRow}>
        {OTHER_BUCKETS.map((b, i) => {
          const amount = bucketAmount(a, b.key);
          const open = b.drill && amount !== 0 ? () => openBucket(receivable, scope, b) : undefined;
          return (
            <Pressable
              key={b.key}
              disabled={!open}
              onPress={open}
              style={({ pressed }) => [styles.unmatchedCell, i > 0 && styles.divider, pressed && styles.pressed]}>
              <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                {bucketLabel(b, receivable)}
                {open ? ' ›' : ''}
              </Text>
              <Text
                variant="label"
                weight="bold"
                color={amount === 0 ? t.colors.textFaint : t.colors.text}
                style={styles.num}>
                {formatCompact(amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
});

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  center: { textAlign: 'center', marginTop: 24 },
  flex: { flex: 1 },
  // Home's approvals card: surface, hairline in the side's ink, and a soft halo of the same colour.
  summary: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: 16,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: t.dark ? 0.22 : 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  aurora: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sides: { flexDirection: 'row', gap: 16 },
  underline: { height: 2, borderRadius: 1, marginTop: 3 },
  hidden: { opacity: 0 },
  scopes: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 2,
    padding: 2,
    marginTop: 10,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.fill,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: t.radius.pill },
  pillOn: { backgroundColor: t.colors.surface, ...t.shadow.card },
  totalLabel: { marginTop: 14 },
  total: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  pair: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: t.radius.md,
    backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: t.colors.edgeLight,
  },
  chipHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipValue: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: t.fonts.medium,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  ring: { alignItems: 'center', gap: 2 },
  ringText: { fontSize: 10, lineHeight: 12 },
  num: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
  breakdown: { marginTop: 14, paddingVertical: 14, gap: 2 },
  breakdownHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: t.colors.fill,
    marginBottom: 8,
  },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pct: { width: 40, textAlign: 'right' },
  amount: { minWidth: 72, textAlign: 'right' },
  unmatched: { marginTop: 12, paddingVertical: 14, gap: 10 },
  unmatchedRow: { flexDirection: 'row' },
  unmatchedCell: { flex: 1, gap: 2, paddingHorizontal: 8 },
  divider: { borderLeftWidth: 1, borderLeftColor: t.colors.fill },
}));
