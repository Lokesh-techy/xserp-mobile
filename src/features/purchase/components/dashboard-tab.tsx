/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';
import { AuroraBackdrop, BarChartCard, CountUp, QueryState, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { purchaseSummary, type OrderKind, type PoGroup, type PurchaseSummary } from '../dashboard-model';
import { usePurchaseDashboard } from '../hooks';

// Purchase's amber, as ink on the card and as the aurora behind it (same treatment as Finance's ageing card).
const INK = { light: '#B86E00', dark: '#F2B550' };
const AURORA = ['#F59E0B', '#F97316', '#EAB308'];

/** Opens PO Lookup narrowed to one delivery state and order kind, over this financial year (the dashboard's span). */
const openLookup = (delivery: string, kind: OrderKind | undefined) =>
  router.setParams({ tab: 'lookup', delivery, kind });

const KINDS: { key: OrderKind; label: string }[] = [
  { key: 'po', label: 'Purchase orders' },
  { key: 'jo', label: 'Job orders' },
];

export function DashboardTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const query = usePurchaseDashboard();
  const [kind, setKind] = useState<OrderKind>('po');
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>
        {(d) => {
          // Older servers send POs and JOs combined only: no switch then.
          const split = d.by_type ? kind : undefined;
          const s = purchaseSummary(d, split);
          return (
            <>
              <HeaderCard s={s} kind={split} onKind={setKind} />
              <View style={styles.chart}>
                <BarChartCard
                  title="On-time delivery"
                  subtitle={
                    s.onTime
                      ? `${s.onTime.month}: ${s.onTime.pct}% on time${s.onTime.delta ? ` · ${s.onTime.delta > 0 ? '▲' : '▼'} ${Math.abs(s.onTime.delta)} pts` : ''}`
                      : `${split === 'jo' ? 'Job' : 'Purchase'} orders by month`
                  }
                  format={(n) => String(Math.round(n))}
                  series={[
                    { label: 'On time', color: t.colors.success },
                    { label: 'Delayed', color: t.colors.danger },
                  ]}
                  data={s.performance.map((p) => ({ label: p.po_month, values: [p.on_time, p.delayed] }))}
                />
              </View>
            </>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

/** Everything at a glance: open POs, how many are late, where they sit, and the indent pipeline feeding them. */
function HeaderCard({ s, kind, onKind }: { s: PurchaseSummary; kind?: OrderKind; onKind: (k: OrderKind) => void }) {
  const t = useTheme();
  const styles = useStyles();
  const ink = t.dark ? INK.dark : INK.light;
  const { indents } = s;
  return (
    <View style={[styles.card, { shadowColor: ink, borderColor: `${ink}33` }]}>
      <View style={styles.aurora} pointerEvents="none">
        <AuroraBackdrop tints={AURORA} />
      </View>

      {kind && (
        <View style={styles.kinds}>
          {KINDS.map((k) => (
            <KindWord key={k.key} label={k.label} active={kind === k.key} ink={ink} onPress={() => onKind(k.key)} />
          ))}
        </View>
      )}

      <View style={styles.topRow}>
        <View style={styles.flex}>
          <Text variant="overline" color={t.colors.textMuted}>
            {kind ? 'Open' : 'Open purchase orders'}
          </Text>
          <View style={styles.totalRow}>
            <CountUp value={s.open} variant="display" style={styles.total} />
            {s.openValue > 0 && (
              <Text variant="label" weight="medium" color={t.colors.textMuted} style={styles.num}>
                {formatCompact(s.openValue)} on order
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => openLookup('delayed', kind)}
            disabled={!s.delayed}
            hitSlop={6}
            accessibilityRole="button">
            <Text variant="caption" weight="medium" color={s.delayed ? t.colors.dangerText : t.colors.successText}>
              {s.delayed
                ? `${s.delayed} running late${s.delayedValue > 0 ? ` · ${formatCompact(s.delayedValue)}` : ''} ›`
                : s.open
                  ? 'All on track'
                  : 'Nothing on order'}
            </Text>
          </Pressable>
        </View>
        <OnTrackRing pct={s.onTrackPct} ink={ink} />
      </View>

      <View style={styles.groups}>
        {s.groups.map((g) => (
          <GroupRow key={g.key} g={g} kind={kind} />
        ))}
      </View>

      <View style={styles.rule} />

      <View style={styles.indentHead}>
        <Text variant="label" color={ink}>
          Indents
        </Text>
        <Text variant="caption" color={t.colors.textMuted} style={styles.num}>
          {indents.raised} raised · {indents.closed} closed
        </Text>
      </View>
      <View style={styles.indentBar}>
        {indents.closed > 0 && <View style={{ flex: indents.closed, backgroundColor: t.colors.success }} />}
        {indents.pending > 0 && <View style={{ flex: indents.pending, backgroundColor: ink }} />}
      </View>
      <View style={styles.pair}>
        <Tile label="Open" value={indents.pending} dot={ink} />
        <Tile label="Due for PO" value={indents.duePo} dot={t.colors.danger} />
        <Tile label="Due material" value={indents.dueMaterial} dot={t.colors.violet} />
      </View>
    </View>
  );
}

/** One delivery state: its count, an on-track/late split bar, and a tap into PO Lookup. */
function GroupRow({ g, kind }: { g: PoGroup; kind?: OrderKind }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => openLookup(g.key, kind)}
      style={({ pressed }) => [styles.group, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${g.label}, ${g.total}: ${g.onTrack} on track, ${g.delayed} delayed`}>
      <View style={styles.groupHead}>
        <Text variant="body" weight="medium" style={styles.flex}>
          {g.label}
        </Text>
        <Text variant="title" style={styles.groupTotal}>
          {g.total}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={t.colors.textFaint} />
      </View>
      {g.value > 0 && (
        <Text variant="caption" color={t.colors.textMuted} style={styles.num}>
          {formatCompact(g.value)}
        </Text>
      )}
      <View style={styles.split}>
        {g.onTrack > 0 && <View style={{ flex: g.onTrack, backgroundColor: t.colors.success }} />}
        {g.delayed > 0 && <View style={{ flex: g.delayed, backgroundColor: t.colors.danger }} />}
      </View>
      <Text variant="caption" color={t.colors.textMuted} style={styles.num}>
        {g.onTrack} on track ·{' '}
        <Text variant="caption" color={g.delayed ? t.colors.dangerText : t.colors.textMuted}>
          {g.delayed} delayed
        </Text>
      </Text>
    </Pressable>
  );
}

/** The PO/JO switch, worded like the ageing card's Receivables/Payables: bold ink and an underline when on. */
function KindWord({
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

/** A frosted tile like the ageing card's: translucent over the aurora, defined by a hairline. */
function Tile({ label, value, dot }: { label: string; value: number; dot: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <View style={[styles.tileDot, { backgroundColor: dot }]} />
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="title" color={value ? t.colors.text : t.colors.textFaint} style={styles.tileValue}>
        {value}
      </Text>
    </View>
  );
}

const R = 24;
const C = 2 * Math.PI * R;

/** Share of open POs still on schedule: green when healthy, amber, then red. */
function OnTrackRing({ pct, ink }: { pct: number | null; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  const color = pct === null ? ink : pct >= 75 ? t.colors.success : pct >= 50 ? t.colors.warning : t.colors.danger;
  return (
    <View style={styles.ring} accessibilityLabel={pct === null ? 'No open purchase orders' : `${pct}% on track`}>
      <Svg width={60} height={60} viewBox="0 0 60 60">
        <Circle cx={30} cy={30} r={R} stroke={t.colors.fill} strokeWidth={5} fill="none" />
        {pct !== null && pct > 0 && (
          <Circle
            cx={30}
            cy={30}
            r={R}
            stroke={color}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(C * pct) / 100} ${C}`}
            transform="rotate(-90 30 30)"
          />
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

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
  // Same shell as the ageing summary: surface, hairline in the module's ink, and a soft halo of it.
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: t.dark ? 0.22 : 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  aurora: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  kinds: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  underline: { height: 2, borderRadius: 1, marginTop: 3 },
  hidden: { opacity: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  total: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'], marginTop: 2 },
  ring: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  ringCaption: { fontSize: 9, lineHeight: 11 },
  groups: { flexDirection: 'row', gap: 8, marginTop: 14 },
  group: {
    flex: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: t.colors.edgeLight,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupTotal: { fontSize: 20, lineHeight: 26, fontFamily: t.fonts.medium, fontVariant: ['tabular-nums'] },
  split: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: t.colors.fill,
  },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.divider, marginVertical: 14 },
  indentHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  indentBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: t.colors.fill,
    marginTop: 8,
  },
  pair: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tile: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: t.radius.md,
    backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: t.colors.edgeLight,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileDot: { width: 7, height: 7, borderRadius: 4 },
  tileValue: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: t.fonts.medium,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  chart: { marginTop: 14 },
}));
