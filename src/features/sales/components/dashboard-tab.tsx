/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';
import { AuroraBackdrop, BarChartCard, CountUp, QueryState, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { salesSummary, type SalesKind, type SalesSummary, type Stage } from '../dashboard-model';
import { useInvoiceStatus, useOaStatus, useReceivableAging, useSalesDashboard } from '../hooks';

// Sales's green, as ink on the card and as the aurora behind it (same treatment as Purchase's amber card).
const INK = { light: '#11795A', dark: '#4FD1A5' };
const AURORA = ['#10B981', '#14B8A6', '#84CC16'];
// Fresh to old, the same ramp the Finance ageing card uses.
const AGE_COLORS = ['#2BAE73', '#E3B23C', '#E8893A', '#B3261E'];

const KINDS: { key: SalesKind; label: string }[] = [
  { key: 'oa', label: 'Order acks' },
  { key: 'invoice', label: 'Invoices' },
];

type Words = { title: string; late: string; clear: string; none: string; loading: string; done: string; left: string; of: string };

// What each side of the switch counts, and how it words lateness and progress.
const TRACK_TEXT: Record<SalesKind, Words> = {
  oa: {
    title: 'Open, to be invoiced',
    late: 'past delivery date',
    clear: 'All on track',
    none: 'Nothing to deliver',
    loading: 'Checking delivery dates…',
    done: 'invoiced',
    left: 'to invoice',
    of: 'ordered',
  },
  invoice: {
    title: 'Awaiting payment',
    late: 'past due date',
    clear: 'All within credit period',
    none: 'Nothing outstanding',
    loading: 'Checking due dates…',
    done: 'collected',
    left: 'to collect',
    of: 'billed',
  },
};

export function DashboardTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const query = useSalesDashboard();
  const oa = useOaStatus();
  const invoice = useInvoiceStatus();
  const aging = useReceivableAging();
  const [month, setMonth] = useState<string>();
  const [kind, setKind] = useState<SalesKind>('oa');
  const refetch = useCallback(
    () => Promise.all([query.refetch(), oa.refetch(), invoice.refetch(), aging.refetch()]),
    [query, oa, invoice, aging],
  );
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>
        {(d) => {
          const s = salesSummary(d, oa.data, aging.data?.trade, month, invoice.data);
          const collected = new Map(s.collections.map((m) => [m.month, m.value]));
          return (
            <>
              <HeaderCard s={s} kind={kind} onKind={setKind} onMonth={setMonth} />
              <View style={styles.chart}>
                <BarChartCard
                  title="Sales vs collections"
                  subtitle="Invoiced and received, by month"
                  series={[
                    { label: 'Sales', color: t.dark ? INK.dark : INK.light },
                    { label: 'Collected', color: t.colors.infoText },
                  ]}
                  data={s.performance.map((m) => ({ label: m.month, values: [m.value, collected.get(m.month) ?? 0] }))}
                />
              </View>
            </>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

type HeaderProps = { s: SalesSummary; kind: SalesKind; onKind: (k: SalesKind) => void; onMonth: (m: string) => void };

/** Everything at a glance, kept dense: open OAs or unpaid invoices by stage, a month's sales and collections, what customers owe. */
function HeaderCard({ s, kind, onKind, onMonth }: HeaderProps) {
  const t = useTheme();
  const styles = useStyles();
  const ink = t.dark ? INK.dark : INK.light;
  const session = useSessionStore((x) => x.session);
  const canApprove = can(session, 'SALES', 'approve');
  const canAgeing = can(session, 'ACCOUNTS', 'view');
  const pending = canApprove ? (kind === 'oa' ? session?.counts.oa : session?.counts.invoice) ?? 0 : 0;
  const o = s.track[kind];
  const words = TRACK_TEXT[kind];
  return (
    <View style={[styles.card, { shadowColor: ink, borderColor: `${ink}33` }]}>
      <View style={styles.aurora} pointerEvents="none">
        <AuroraBackdrop tints={AURORA} />
      </View>

      <View style={styles.kinds}>
        {KINDS.map((k) => (
          <KindWord key={k.key} label={k.label} active={kind === k.key} ink={ink} onPress={() => onKind(k.key)} />
        ))}
        <View style={styles.flex} />
        {pending > 0 && (
          <Pressable
            onPress={() => router.setParams({ tab: kind === 'oa' ? 'pendingOa' : 'pendingInvoices' })}
            hitSlop={8}
            style={({ pressed }) => [styles.pill, { borderColor: `${ink}55` }, pressed && styles.pressed]}
            accessibilityRole="button">
            <Text variant="caption" weight="bold" color={ink} style={styles.num}>
              {pending} to approve
            </Text>
            <Ionicons name="chevron-forward" size={12} color={ink} />
          </Pressable>
        )}
      </View>

      <View style={styles.topRow}>
        <View style={styles.flex}>
          <Text variant="overline" color={t.colors.textMuted}>
            {words.title}
          </Text>
          <View style={styles.totalRow}>
            <CountUp value={o?.open ?? 0} variant="display" style={styles.total} />
            {!!o?.openValue && (
              <Text variant="label" weight="medium" color={t.colors.textMuted} style={styles.num}>
                {formatCompact(o.openValue)} {words.left}
              </Text>
            )}
          </View>
          <Text variant="caption" weight="medium" color={o?.late ? t.colors.dangerText : t.colors.successText} numberOfLines={1}>
            {!o
              ? words.loading
              : o.late
                ? `${o.late} ${words.late}${o.lateValue ? ` · ${formatCompact(o.lateValue)}` : ''}`
                : o.open
                  ? words.clear
                  : words.none}
          </Text>
        </View>
        <OnTrackRing pct={o?.onTrackPct ?? null} ink={ink} />
      </View>

      {!!o?.stages.length && (
        <View style={styles.panel}>
          {o.stages.map((g) => (
            <StageRow key={g.key} g={g} />
          ))}
          {!!o.progress?.total && (
            <Text variant="caption" color={t.colors.textMuted} style={styles.num} numberOfLines={1}>
              <Text variant="caption" weight="bold" color={ink}>
                {o.progress.pct ?? 0}% {words.done}
              </Text>
              {' · '}
              {formatCompact(o.progress.done)} of {formatCompact(o.progress.total)} {words.of}
            </Text>
          )}
        </View>
      )}

      <MonthStrip s={s} onMonth={onMonth} ink={ink} />

      {s.receivable && (
        <Pressable
          disabled={!canAgeing}
          onPress={() => router.push({ pathname: '/finance', params: { tab: 'ageing', side: 'receivable' } })}
          style={({ pressed }) => [styles.receivable, pressed && styles.pressed]}
          accessibilityRole={canAgeing ? 'button' : undefined}>
          <View style={styles.line}>
            <Text variant="label" color={ink}>
              Receivables
            </Text>
            <Text variant="label" weight="bold" style={styles.num}>
              {formatCompact(s.receivable.total)}
            </Text>
            <View style={styles.flex} />
            {s.receivable.overdue > 0 && (
              <Text variant="caption" color={t.colors.dangerText} style={styles.num}>
                {formatCompact(s.receivable.overdue)} overdue
              </Text>
            )}
            {canAgeing && <Ionicons name="chevron-forward" size={14} color={t.colors.textFaint} />}
          </View>
          <View style={styles.bar}>
            {s.receivable.slices.map((x, i) => x.value > 0 && <View key={x.key} style={{ flex: x.value, backgroundColor: AGE_COLORS[i] }} />)}
          </View>
          <View style={styles.legend}>
            {s.receivable.slices.map((x, i) => (
              <View key={x.key} style={styles.legendItem}>
                <View style={styles.line}>
                  <View style={[styles.dot, { backgroundColor: AGE_COLORS[i] }]} />
                  <Text variant="caption" color={t.colors.textMuted}>
                    {x.label}
                  </Text>
                </View>
                <Text variant="caption" weight="bold" color={x.value ? t.colors.text : t.colors.textFaint} style={styles.num} numberOfLines={1}>
                  {formatCompact(x.value)}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

/** One stage as a single table row: name, count, what is left, and an on-track/late bar with the late count. */
function StageRow({ g }: { g: Stage }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.stage} accessibilityLabel={`${g.label}: ${g.count}, ${formatCompact(g.value)} left, ${g.late} late`}>
      <Text variant="label" weight="medium" style={styles.stageName} numberOfLines={1}>
        {g.label}
      </Text>
      <Text variant="label" weight="bold" style={[styles.num, styles.stageCount]}>
        {g.count}
      </Text>
      <Text variant="label" style={[styles.num, styles.stageValue]} numberOfLines={1}>
        {formatCompact(g.value)}
      </Text>
      <View style={[styles.split, styles.flex]}>
        {g.onTrack > 0 && <View style={{ flex: g.onTrack, backgroundColor: t.colors.success }} />}
        {g.late > 0 && <View style={{ flex: g.late, backgroundColor: t.colors.danger }} />}
      </View>
      <Text variant="caption" color={g.late ? t.colors.dangerText : t.colors.textFaint} style={[styles.num, styles.stageLate]} numberOfLines={1}>
        {g.late} late
      </Text>
    </View>
  );
}

/** ‹ Sep'26 › beside that month's sales and collections, in one row. */
function MonthStrip({ s, onMonth, ink }: { s: SalesSummary; onMonth: (m: string) => void; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  const { months, month } = s;
  if (!month) return null;
  const i = months.indexOf(month);
  const arrow = (by: number, icon: 'chevron-back' | 'chevron-forward', label: string) => {
    const next = months[i + by];
    return (
      <Pressable onPress={() => next && onMonth(next)} disabled={!next} hitSlop={10} accessibilityRole="button" accessibilityLabel={label}>
        <Ionicons name={icon} size={16} color={next ? ink : t.colors.textFaint} />
      </Pressable>
    );
  };
  const change = s.sales?.change ?? null;
  return (
    <View style={[styles.panel, styles.strip]}>
      <View style={styles.stepper}>
        {arrow(-1, 'chevron-back', 'Previous month')}
        <Pressable onPress={() => onMonth(months[months.length - 1]!)} disabled={i === months.length - 1} accessibilityRole="button" accessibilityLabel="Latest month">
          <Text variant="caption" weight="bold" color={ink} style={styles.num}>
            {month}
          </Text>
        </Pressable>
        {arrow(1, 'chevron-forward', 'Next month')}
      </View>
      <View style={styles.flex}>
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
          Sales{' '}
          {change != null && (
            <Text variant="caption" color={change >= 0 ? t.colors.successText : t.colors.dangerText}>
              {change >= 0 ? '▲' : '▼'}
              {Math.abs(change)}%
            </Text>
          )}
        </Text>
        <Text variant="label" weight="bold" style={styles.num} numberOfLines={1}>
          {formatCompact(s.sales?.value ?? 0)}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
          Collected{s.collected?.onTimePct != null ? ` · ${s.collected.onTimePct}% on time` : ''}
        </Text>
        <Text variant="label" weight="bold" style={styles.num} numberOfLines={1}>
          {formatCompact(s.collected?.value ?? 0)}
        </Text>
      </View>
    </View>
  );
}

/** The OA/Invoice switch, worded like Purchase's PO/JO: bold ink and an underline when on. */
function KindWord({ label, active, ink, onPress }: { label: string; active: boolean; ink: string; onPress: () => void }) {
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

const R = 24;
const C = 2 * Math.PI * R;

/** Share still within its delivery or due date: green when healthy, amber, then red. */
function OnTrackRing({ pct, ink }: { pct: number | null; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  const color = pct === null ? ink : pct >= 75 ? t.colors.success : pct >= 50 ? t.colors.warning : t.colors.danger;
  return (
    <View style={styles.ring} accessibilityLabel={pct === null ? 'Nothing open' : `${pct}% on track`}>
      <Svg width={60} height={60} viewBox="0 0 60 60">
        <Circle cx={30} cy={30} r={R} stroke={t.colors.fill} strokeWidth={5} fill="none" />
        {pct !== null && pct > 0 && (
          <Circle cx={30} cy={30} r={R} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 30 30)" />
        )}
      </Svg>
      <View style={styles.ringLabel}>
        <Text variant="label" weight="bold" style={styles.num}>
          {pct === null ? '—' : `${pct}%`}
        </Text>
        <Text variant="caption" color={t.colors.textMuted} style={styles.ringCaption}>
          on track
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => {
  const bar = { flexDirection: 'row' as const, height: 6, borderRadius: 3, overflow: 'hidden' as const, gap: 2, backgroundColor: t.colors.fill };
  return {
    pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
    flex: { flex: 1 },
    num: { fontVariant: ['tabular-nums'] },
    pressed: { opacity: 0.6 },
    // Same shell as Purchase's header card: surface, hairline in the module's ink, and a soft halo of it.
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      padding: 14,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      shadowOpacity: t.dark ? 0.22 : 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    aurora: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    kinds: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    underline: { height: 2, borderRadius: 1, marginTop: 3 },
    hidden: { opacity: 0 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
    total: { fontSize: 30, lineHeight: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
    ring: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
    ringLabel: { position: 'absolute', alignItems: 'center' },
    ringCaption: { fontSize: 9, lineHeight: 11 },
    // Translucent over the aurora, defined by a hairline (Purchase's frosted tiles).
    panel: {
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: t.radius.md,
      backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1.5,
      borderColor: t.colors.edgeLight,
    },
    stage: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stageName: { width: 96 },
    stageCount: { width: 28, textAlign: 'right' },
    stageValue: { width: 56, textAlign: 'right' },
    stageLate: { width: 44, textAlign: 'right' },
    split: bar,
    strip: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    receivable: { gap: 8 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bar,
    legend: { flexDirection: 'row' },
    legendItem: { flex: 1, gap: 1 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    chart: { marginTop: 14 },
  };
});
