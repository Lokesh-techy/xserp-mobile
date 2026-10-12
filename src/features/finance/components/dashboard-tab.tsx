/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useSessionStore } from '@/core/auth';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact, formatMoney, formatDate, thisMonth } from '@/core/utils';
import { AuroraBackdrop, BarChartCard, CountUp, HeaderRight, QueryState, RangeChips, Section, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { fetchFinanceDashboard, fetchIncomeExpenses } from '../api';
import { financeSummary, type FinanceDashboard, type FinanceSide, type FinanceSummary, type SideGroup } from '../dashboard-model';
import { financeKeys } from '../keys';

// Finance's blue, as ink on the card and as the aurora behind it (same treatment as Purchase's amber card).
const INK = { light: '#004195', dark: '#7FB0F5' };
const AURORA = ['#2563EB', '#0EA5E9', '#6366F1'];

/** Opens the Ageing tab on one side, so a tile leads to where that money is due. */
const openAgeing = (side: FinanceSide) => router.setParams({ tab: 'ageing', side });

type Row = FinanceDashboard['receivables'][number];

export function DashboardTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const [range, setRange] = useState(() => thisMonth());
  const dash = useQuery({
    queryKey: financeKeys.dashboard(range),
    queryFn: () => fetchFinanceDashboard(range),
    placeholderData: (p) => p,
  });
  const ie = useQuery({ queryKey: financeKeys.incomeExpenses(), queryFn: fetchIncomeExpenses });
  const refetch = useCallback(() => Promise.all([dash.refetch(), ie.refetch()]), [dash, ie]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <HeaderRight>
        <RangeChips value={range} onChange={setRange} fyStartDay={fy} />
      </HeaderRight>
      <QueryState query={dash}>
        {(d) => {
          const s = financeSummary(d, ie.data);
          return (
            <>
              <HeaderCard s={s} d={d} />
              {ie.data && (
                <View style={styles.chart}>
                  <BarChartCard
                    title="Income vs expense"
                    subtitle={
                      s.latest
                        ? `${s.latest.month}: net ${formatCompact(s.latest.net)}${s.latest.change ? ` · ${s.latest.change > 0 ? '▲' : '▼'} ${formatCompact(Math.abs(s.latest.change))}` : ''}`
                        : 'By month'
                    }
                    series={[
                      { label: 'Income', color: t.colors.success },
                      { label: 'Expense', color: t.colors.danger },
                    ]}
                    data={ie.data.map((m) => ({ label: m.month, values: [m.income, m.expense] }))}
                  />
                </View>
              )}
              {d.receivables.length > 0 && (
                <Section title="Top receivables">
                  <ShareList rows={d.receivables.slice(0, 5)} total={d.receivable} color={t.colors.success} />
                </Section>
              )}
              {d.payables.length > 0 && (
                <Section title="Top payables">
                  <ShareList rows={d.payables.slice(0, 5)} total={d.payable} color={t.colors.danger} />
                </Section>
              )}
              {!!d.sync_datetime && (
                <Text variant="caption" color={t.colors.textMuted} style={styles.sync}>
                  Synced {formatDate(d.sync_datetime, 'dd MMM yyyy, HH:mm')}
                </Text>
              )}
            </>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

/** Everything at a glance: cash and bank, how far it covers payables, both sides' dues, and this period's sales and tax. */
function HeaderCard({ s, d }: { s: FinanceSummary; d: FinanceDashboard }) {
  const t = useTheme();
  const styles = useStyles();
  const ink = t.dark ? INK.dark : INK.light;
  const [open, setOpen] = useState<'bank' | 'cash' | null>(null);
  const toggle = (k: 'bank' | 'cash') => setOpen((o) => (o === k ? null : k));
  const accounts = open === 'bank' ? d.bank_balance : open === 'cash' ? d.cash_in_hand : [];
  return (
    <View style={[styles.card, { shadowColor: ink, borderColor: `${ink}33` }]}>
      <View style={styles.aurora} pointerEvents="none">
        <AuroraBackdrop tints={AURORA} />
      </View>

      <View style={styles.topRow}>
        <View style={styles.flex}>
          <Text variant="overline" color={t.colors.textMuted}>
            Cash & bank
          </Text>
          <CountUp value={s.liquid} format={formatCompact} variant="display" style={styles.total} />
          <Text variant="caption" weight="medium" color={s.net >= 0 ? t.colors.successText : t.colors.dangerText}>
            {s.net >= 0 ? `${formatCompact(s.net)} more due in than out` : `${formatCompact(-s.net)} more due out than in`}
          </Text>
        </View>
        <CoverRing pct={s.coverPct} ink={ink} />
      </View>

      <View style={styles.pair}>
        <Tile label="Bank" value={s.bank} dot={ink} caption={countLabel(s.bankAccounts, 'account')} expanded={open === 'bank'} onPress={s.bankAccounts ? () => toggle('bank') : undefined} />
        <Tile label="Cash in hand" value={s.cash} dot={t.colors.violet} caption={countLabel(s.cashLedgers, 'ledger')} expanded={open === 'cash'} onPress={s.cashLedgers ? () => toggle('cash') : undefined} />
      </View>
      {accounts.length > 0 && <Accounts rows={accounts} />}

      <View style={styles.groups}>
        {s.sides.map((g) => (
          <SideRow key={g.key} g={g} />
        ))}
      </View>

      <View style={styles.rule} />

      <View style={styles.periodHead}>
        <Text variant="label" color={ink}>
          This period
        </Text>
      </View>
      <View style={styles.pair}>
        <Tile label="Sales revenue" value={s.period.sales} dot={t.colors.success} />
        <Tile label="Tax liability" value={s.period.tax} dot={t.colors.danger} />
      </View>
    </View>
  );
}

/** One side: what is due, a trade/others split bar, its biggest party, and a tap into Ageing. */
function SideRow({ g }: { g: SideGroup }) {
  const t = useTheme();
  const styles = useStyles();
  const color = g.key === 'receivable' ? t.colors.success : t.colors.danger;
  return (
    <Pressable
      onPress={() => openAgeing(g.key)}
      style={({ pressed }) => [styles.group, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${g.label}, ${formatCompact(g.total)}: ${formatCompact(g.trade)} trade, ${formatCompact(g.others)} others`}>
      <View style={styles.groupHead}>
        <Text variant="body" weight="medium" style={styles.flex} numberOfLines={1}>
          {g.label}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={t.colors.textFaint} />
      </View>
      <Text variant="title" style={styles.groupTotal} numberOfLines={1} adjustsFontSizeToFit>
        {formatCompact(g.total)}
      </Text>
      <View style={styles.split}>
        {g.trade > 0 && <View style={{ flex: g.trade, backgroundColor: color }} />}
        {g.others > 0 && <View style={{ flex: g.others, backgroundColor: `${color}66` }} />}
      </View>
      <Text variant="caption" color={t.colors.textMuted} style={styles.num} numberOfLines={1}>
        {formatCompact(g.trade)} trade · {formatCompact(g.others)} others
      </Text>
      {g.top && (
        <Text variant="caption" color={t.colors.textFaint} numberOfLines={1}>
          Top: {g.top.name} · {g.top.pct}%
        </Text>
      )}
    </Pressable>
  );
}

const countLabel = (n: number, noun: string) => (n ? `${n} ${noun}${n === 1 ? '' : 's'}` : undefined);

/** A frosted tile like Purchase's: translucent over the aurora, defined by a hairline. Tappable ones expand accounts. */
function Tile({ label, value, dot, caption, expanded, onPress }: { label: string; value: number; dot: string; caption?: string; expanded?: boolean; onPress?: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.tileHead}>
        <View style={[styles.tileDot, { backgroundColor: dot }]} />
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1} style={styles.flex}>
          {label}
        </Text>
        {onPress && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={t.colors.textFaint} />}
      </View>
      <Text variant="title" color={value ? t.colors.text : t.colors.textFaint} style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {formatCompact(value)}
      </Text>
      {!!caption && (
        <Text variant="caption" color={t.colors.textFaint} numberOfLines={1}>
          {caption}
        </Text>
      )}
    </Pressable>
  );
}

/** Per-account balances behind the Bank / Cash tile, inside the card. */
function Accounts({ rows }: { rows: Row[] }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.accounts}>
      {rows.map((r) => (
        <View key={r.id || r.name} style={styles.line}>
          <View style={styles.flex}>
            <Text variant="rowTitle" numberOfLines={1}>
              {r.name}
            </Text>
            {!!r.group_name && (
              <Text variant="caption" color={t.colors.textFaint} numberOfLines={1}>
                {r.group_name}
              </Text>
            )}
          </View>
          <Text variant="label" weight="bold" style={styles.num} color={r.value < 0 ? t.colors.danger : t.colors.text}>
            {formatMoney(r.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Top parties with a bar for their share of the total, so the biggest exposure reads at a glance. */
function ShareList({ rows, total, color }: { rows: Row[]; total: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {rows.map((r) => {
        const share = total > 0 ? Math.min(1, Math.abs(r.value) / total) : 0;
        return (
          <View key={r.id || r.name} style={styles.share}>
            <View style={styles.line}>
              <Text variant="rowTitle" numberOfLines={1} style={styles.flex}>
                {r.name}
              </Text>
              <Text variant="label" weight="bold" style={styles.num}>
                {formatMoney(r.value)}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const R = 24;
const C = 2 * Math.PI * R;

/** Share of payables that cash and bank could settle now: green when covered, amber, then red. */
function CoverRing({ pct, ink }: { pct: number | null; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  const color = pct === null ? ink : pct >= 75 ? t.colors.success : pct >= 40 ? t.colors.warning : t.colors.danger;
  return (
    <View style={styles.ring} accessibilityLabel={pct === null ? 'Nothing payable' : `Cash and bank cover ${pct}% of payables`}>
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
          covers dues
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => {
  const frosted = {
    borderRadius: t.radius.md,
    backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: t.colors.edgeLight,
  };
  return {
    pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
    flex: { flex: 1 },
    num: { fontVariant: ['tabular-nums'] },
    pressed: { opacity: 0.6 },
    // Same shell as Purchase's header card: surface, hairline in the module's ink, and a soft halo of it.
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
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    total: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'], marginTop: 2 },
    ring: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
    ringLabel: { position: 'absolute', alignItems: 'center' },
    ringCaption: { fontSize: 8, lineHeight: 10 },
    groups: { flexDirection: 'row', gap: 8, marginTop: 8 },
    group: { ...frosted, flex: 1, gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    groupTotal: { fontSize: 20, lineHeight: 26, fontFamily: t.fonts.medium, fontVariant: ['tabular-nums'] },
    split: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, backgroundColor: t.colors.fill },
    rule: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.divider, marginVertical: 14 },
    periodHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    pair: { flexDirection: 'row', gap: 8, marginTop: 12 },
    tile: { ...frosted, flex: 1, gap: 4, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
    tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tileDot: { width: 7, height: 7, borderRadius: 4 },
    tileValue: { fontSize: 20, lineHeight: 26, fontFamily: t.fonts.medium, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
    accounts: { ...frosted, marginTop: 8, gap: 12, padding: 12 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    list: { gap: 12, paddingVertical: 4 },
    share: { gap: 6 },
    track: { height: 4, borderRadius: 2, backgroundColor: t.colors.fill, overflow: 'hidden' },
    fill: { height: 4, borderRadius: 2 },
    chart: { marginTop: 14 },
    sync: { textAlign: 'center', marginTop: 12 },
  };
});
