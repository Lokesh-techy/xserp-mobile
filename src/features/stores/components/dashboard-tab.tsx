/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact, lastDays } from '@/core/utils';
import { AuroraBackdrop, BarChartCard, HeaderRight, QueryState, RangeChips, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { storesSummary, type StoresSummary } from '../dashboard-model';
import { useGrnStatus, useIndentStatus, useStoreDashboard } from '../hooks';

// Stores's blue, as ink on the card and as the aurora behind it (same treatment as the other modules' cards).
const INK = { light: '#0E6FA8', dark: '#6CC4F5' };
const AURORA = ['#209BE1', '#06B6D4', '#6366F1'];

export function DashboardTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const [range, setRange] = useState(() => lastDays(30));
  const dash = useStoreDashboard(range);
  const indent = useIndentStatus(range);
  const grn = useGrnStatus(range);
  const refetch = useCallback(() => Promise.all([dash.refetch(), indent.refetch(), grn.refetch()]), [dash, indent, grn]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  const ink = t.dark ? INK.dark : INK.light;
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <HeaderRight>
        <RangeChips value={range} onChange={setRange} fyStartDay={fy} />
      </HeaderRight>
      <QueryState query={dash}>
        {(d) => {
          const s = storesSummary(d, indent.data, grn.data);
          return (
            <>
              <HeaderCard s={s} />
              {s.monthly.length > 0 && (
                <View style={styles.block}>
                  <BarChartCard
                    title="Closing stock"
                    subtitle="Value at each month's end"
                    series={[{ label: 'Closing stock', color: ink }]}
                    data={s.monthly.map((m) => ({ label: m.month, values: [m.closing_stock] }))}
                  />
                </View>
              )}
              {s.mix.length > 0 && <MixCard s={s} ink={ink} />}
            </>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

/** Stock value and how it moved over the range, then the indent and GRN pipelines, kept dense. */
function HeaderCard({ s }: { s: StoresSummary }) {
  const t = useTheme();
  const styles = useStyles();
  const ink = t.dark ? INK.dark : INK.light;
  const session = useSessionStore((x) => x.session);
  const toApprove = can(session, 'STORES', 'approve') ? (session?.counts.grn ?? 0) : 0;
  const st = s.stock;
  return (
    <View style={[styles.card, { shadowColor: ink, borderColor: `${ink}33` }]}>
      <View style={styles.aurora} pointerEvents="none">
        <AuroraBackdrop tints={AURORA} />
      </View>

      <View style={styles.topRow}>
        <View style={styles.flex}>
          <View style={styles.line}>
            <Text variant="overline" color={t.colors.textMuted} style={styles.flex}>
              Closing stock
            </Text>
            {toApprove > 0 && (
              <Pressable
                onPress={() => router.setParams({ tab: 'grn' })}
                hitSlop={8}
                style={({ pressed }) => [styles.pill, { borderColor: `${ink}55` }, pressed && styles.pressed]}
                accessibilityRole="button">
                <Text variant="caption" weight="bold" color={ink} style={styles.num}>
                  {toApprove} GRN{toApprove === 1 ? '' : 's'} to approve
                </Text>
                <Ionicons name="chevron-forward" size={12} color={ink} />
              </Pressable>
            )}
          </View>
          <Text variant="display" style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            {formatCompact(st?.closing ?? 0)}
          </Text>
          {st && (
            <Text variant="caption" weight="medium" color={st.change >= 0 ? t.colors.successText : t.colors.dangerText} style={styles.num}>
              {st.change >= 0 ? '▲' : '▼'} {formatCompact(Math.abs(st.change))}
              {st.changePct !== null ? ` (${Math.abs(st.changePct)}%)` : ''} since the start of the range
            </Text>
          )}
        </View>
      </View>

      {st && (
        <View style={[styles.panel, styles.strip]}>
          <Figure label="Opening" value={formatCompact(st.opening)} />
          <Figure label="Received" value={`+${formatCompact(st.received)}`} color={t.colors.successText} />
          <Figure label="Issued" value={`−${formatCompact(st.issued)}`} color={t.colors.dangerText} />
        </View>
      )}

      {(s.indents || s.grns) && (
        <View style={styles.panel}>
          {s.indents && (
            <PipeRow
              label="Indents"
              raised={s.indents.raised}
              done={s.indents.closed}
              open={s.indents.open}
              openLabel="open"
              pct={s.indents.closedPct}
              ink={ink}
              note={`${s.indents.duePo} due for PO · ${s.indents.dueMaterial} due for material`}
            />
          )}
          {s.grns && (
            <PipeRow
              label="GRNs"
              raised={s.grns.raised}
              done={s.grns.accounted}
              open={s.grns.inProcess}
              openLabel="in process"
              pct={s.grns.accountedPct}
              ink={ink}
              note={`${s.grns.accounted} accounted`}
            />
          )}
        </View>
      )}
    </View>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="label" weight="bold" color={color ?? t.colors.text} style={styles.num} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

type PipeProps = { label: string; raised: number; done: number; open: number; openLabel: string; pct: number | null; ink: string; note: string };

/** One pipeline (indents, GRNs) as a dense row: raised, a done/open bar, what is still open, and a detail line. */
function PipeRow({ label, raised, done, open, openLabel, pct, ink, note }: PipeProps) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.pipe} accessibilityLabel={`${label}: ${raised} raised, ${open} ${openLabel}`}>
      <View style={styles.pipeRow}>
        <Text variant="label" weight="medium" style={styles.pipeName}>
          {label}
        </Text>
        <Text variant="label" weight="bold" style={[styles.num, styles.pipeCount]}>
          {raised}
        </Text>
        <View style={[styles.split, styles.flex]}>
          {done > 0 && <View style={{ flex: done, backgroundColor: ink }} />}
          {open > 0 && <View style={{ flex: open, backgroundColor: t.colors.warning }} />}
        </View>
        <Text variant="caption" color={open ? t.colors.text : t.colors.textFaint} style={[styles.num, styles.pipeOpen]} numberOfLines={1}>
          {open} {openLabel}
        </Text>
      </View>
      <Text variant="caption" color={t.colors.textMuted} style={[styles.num, styles.pipeNote]} numberOfLines={1}>
        {pct !== null ? `${pct}% done · ` : ''}
        {note}
      </Text>
    </View>
  );
}

/** Stock value by category: the biggest few with a bar for their share. */
function MixCard({ s, ink }: { s: StoresSummary; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.block, styles.mix]}>
      <Text variant="label" weight="bold">
        Stock mix
      </Text>
      {s.mix.map((m) => {
        const share = s.mixTotal > 0 ? m.value / s.mixTotal : 0;
        return (
          <View key={m.label} style={styles.mixRow}>
            <Text variant="caption" style={styles.mixName} numberOfLines={1}>
              {m.label}
            </Text>
            <View style={[styles.track, styles.flex]}>
              <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: ink }]} />
            </View>
            <Text variant="caption" weight="bold" style={[styles.num, styles.mixValue]} numberOfLines={1}>
              {formatCompact(m.value)}
            </Text>
            <Text variant="caption" color={t.colors.textMuted} style={[styles.num, styles.mixPct]}>
              {Math.round(share * 100)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Same shell as the other modules' header cards: surface, hairline in the module's ink, and a soft halo of it.
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
  pill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  total: { fontSize: 30, lineHeight: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  // Translucent over the aurora, defined by a hairline (the frosted tiles the other cards use).
  panel: {
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: t.colors.edgeLight,
  },
  strip: { flexDirection: 'row', gap: 12 },
  pipe: { gap: 3 },
  pipeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pipeName: { width: 64 },
  pipeCount: { width: 32, textAlign: 'right' },
  pipeOpen: { width: 84, textAlign: 'right' },
  pipeNote: { marginLeft: 72 },
  split: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, backgroundColor: t.colors.fill },
  block: { marginTop: 14 },
  mix: {
    gap: 10,
    padding: 14,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.divider,
  },
  mixRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mixName: { width: 96 },
  mixValue: { width: 52, textAlign: 'right' },
  mixPct: { width: 34, textAlign: 'right' },
  track: { height: 6, borderRadius: 3, backgroundColor: t.colors.fill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
}));
