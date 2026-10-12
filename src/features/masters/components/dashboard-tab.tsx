/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { AuroraBackdrop, CountUp, QueryState, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { fetchMastersDashboard } from '../api';
import { mastersSummary, type MastersKind, type MastersSummary, type Share } from '../dashboard-model';
import { mastersKeys } from '../keys';

// Masters's teal, as ink on the card and as the aurora behind it (same treatment as the other modules' cards).
const INK = { light: '#0B6670', dark: '#4FD1D9' };
const AURORA = ['#0E7C86', '#14B8A6', '#06B6D4'];

const KINDS: { key: MastersKind; label: string }[] = [
  { key: 'parties', label: 'Parties' },
  { key: 'materials', label: 'Materials' },
];

export function DashboardTab({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const query = useQuery({ queryKey: mastersKeys.dashboard(), queryFn: fetchMastersDashboard });
  const [kind, setKind] = useState<MastersKind>('parties');
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>{(d) => <HeaderCard s={mastersSummary(d)} kind={kind} onKind={setKind} />}</QueryState>
    </Animated.ScrollView>,
  );
}

/** Parties or materials at a glance: how many, their health ring, and the breakdowns that lead into the lists. */
function HeaderCard({ s, kind, onKind }: { s: MastersSummary; kind: MastersKind; onKind: (k: MastersKind) => void }) {
  const t = useTheme();
  const styles = useStyles();
  const ink = t.dark ? INK.dark : INK.light;
  const session = useSessionStore((x) => x.session);
  const toApprove = can(session, 'MASTERS', 'approve') ? (session?.counts.rate ?? 0) : 0;
  const openList = () => router.setParams({ tab: kind });
  const p = s.parties;
  const m = s.materials;
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
        {toApprove > 0 && (
          <Pressable
            onPress={() => router.setParams({ tab: 'rates' })}
            hitSlop={8}
            style={({ pressed }) => [styles.pill, { borderColor: `${ink}55` }, pressed && styles.pressed]}
            accessibilityRole="button">
            <Text variant="caption" weight="bold" color={ink} style={styles.num}>
              {toApprove} rate{toApprove === 1 ? '' : 's'} to approve
            </Text>
            <Ionicons name="chevron-forward" size={12} color={ink} />
          </Pressable>
        )}
      </View>

      {kind === 'parties' ? (
        <>
          <Headline
            title="Parties"
            count={p.total}
            caption={`${p.active} active · ${p.inactive} inactive`}
            captionColor={p.inactive ? t.colors.textMuted : t.colors.successText}
            ring={{ pct: p.activePct, label: 'active' }}
            ink={ink}
          />
          <Breakdown rows={p.roles} ink={ink} onPress={openList} />
        </>
      ) : (
        <>
          <Headline
            title="Materials in use"
            count={m.inUse}
            caption={`${m.added ? `+${m.added} this month · ` : ''}${m.notInUse} not in use`}
            captionColor={t.colors.textMuted}
            ring={{ pct: m.pricedPct, label: 'priced' }}
            ink={ink}
          />
          <Breakdown rows={m.kinds} ink={ink} onPress={openList} />
          {m.noPrice > 0 && (
            <View style={[styles.panel, styles.line]}>
              <Ionicons name="alert-circle-outline" size={16} color={t.colors.warning} />
              <Text variant="caption" style={styles.flex}>
                <Text variant="caption" weight="bold" style={styles.num}>
                  {m.noPrice}
                </Text>{' '}
                in use with no price set
              </Text>
            </View>
          )}
          {s.categories.length > 0 && (
            <View style={styles.panel}>
              <Text variant="caption" weight="bold" color={t.colors.textMuted}>
                BY CATEGORY
              </Text>
              {s.categories.map((c) => (
                <ShareRow key={c.key} row={c} ink={ink} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

type HeadlineProps = { title: string; count: number; caption: string; captionColor: string; ring: { pct: number | null; label: string }; ink: string };

function Headline({ title, count, caption, captionColor, ring, ink }: HeadlineProps) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.topRow}>
      <View style={styles.flex}>
        <Text variant="overline" color={t.colors.textMuted}>
          {title}
        </Text>
        <CountUp value={count} variant="display" style={styles.total} />
        <Text variant="caption" weight="medium" color={captionColor} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      <Ring pct={ring.pct} label={ring.label} ink={ink} />
    </View>
  );
}

/** A breakdown in one frosted panel, one dense row each; tapping opens the matching list. */
function Breakdown({ rows, ink, onPress }: { rows: Share[]; ink: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.panel, pressed && styles.pressed]} accessibilityRole="button">
      {rows.map((r) => (
        <ShareRow key={r.key} row={r} ink={ink} />
      ))}
    </Pressable>
  );
}

function ShareRow({ row, ink }: { row: Share; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityLabel={`${row.label}: ${row.count}, ${row.pct}%`}>
      <Text variant="label" weight="medium" style={styles.rowName} numberOfLines={1}>
        {row.label}
      </Text>
      <Text variant="label" weight="bold" style={[styles.num, styles.rowCount]}>
        {row.count}
      </Text>
      <View style={[styles.track, styles.flex]}>
        <View style={[styles.fill, { width: `${row.pct}%`, backgroundColor: ink }]} />
      </View>
      <Text variant="caption" color={t.colors.textMuted} style={[styles.num, styles.rowPct]}>
        {row.pct}%
      </Text>
    </View>
  );
}

/** The Parties/Materials switch, worded like the other cards': bold ink and an underline when on. */
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

/** A share as a ring: green when healthy, amber, then red. */
function Ring({ pct, label, ink }: { pct: number | null; label: string; ink: string }) {
  const t = useTheme();
  const styles = useStyles();
  const color = pct === null ? ink : pct >= 90 ? t.colors.success : pct >= 70 ? t.colors.warning : t.colors.danger;
  return (
    <View style={styles.ring} accessibilityLabel={pct === null ? 'None yet' : `${pct}% ${label}`}>
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
          {label}
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
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  kinds: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  underline: { height: 2, borderRadius: 1, marginTop: 3 },
  hidden: { opacity: 0 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  total: { fontSize: 30, lineHeight: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ring: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  ringCaption: { fontSize: 9, lineHeight: 11 },
  // Translucent over the aurora, defined by a hairline (the frosted tiles the other cards use).
  panel: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: t.colors.edgeLight,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { width: 96 },
  rowCount: { width: 44, textAlign: 'right' },
  rowPct: { width: 36, textAlign: 'right' },
  track: { height: 6, borderRadius: 3, backgroundColor: t.colors.fill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
}));
