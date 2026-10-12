/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { ListRow, Text, type RowEdge } from '@/ui';

import { splitCode } from './review-sections';
import type { ApprovalSummary } from './types';

type Props = {
  summary: ApprovalSummary;
  /** Document-type colour, for the chip in mixed lists. */
  tint: string;
  /** Position in its list's panel — `edgeOf(index, data.length)`. */
  edge?: RowEdge;
  onPress?: () => void;
  /** Off for pending queues, where every item has the same status anyway. */
  showStatus?: boolean;
  /** Document-type chip, for lists that mix types (e.g. the review list). */
  kind?: string;
  /** The card's footer bar (`CardActions` with a `DateLabel`); the date then moves out of the facts line. */
  footer?: ReactNode;
};

/** How many facts a row shows besides the date; the rest live on the detail screen. */
const MAX_FACTS = 3;

/**
 * Document row in three tiers: what it is and what it's worth, who it's with (and its status),
 * then the facts you scan for — the labelled date first, then project, delivery, due date…
 */
export function ApprovalCard({ summary, tint, onPress, showStatus = true, kind, edge, footer }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const status = toneColors(t, summary.status.tone);
  return (
    <ListRow edge={edge} onPress={onPress} style={styles.card}>
      <View style={styles.titleRow}>
        {!!kind && (
          <View style={[styles.kind, { backgroundColor: `${tint}1F` }]}>
            <Text variant="caption" weight="bold" color={tint} style={styles.kindText}>
              {kind}
            </Text>
          </View>
        )}
        <DocCode code={summary.code} />
        {typeof summary.amount === 'number' && <Amount value={summary.amount} symbol={summary.currency || '₹'} />}
      </View>
      <View style={styles.row}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.flex}>
          {summary.party || '—'}
        </Text>
        {showStatus && (
          <View style={styles.status}>
            <View style={[styles.dot, { backgroundColor: status.fg }]} />
            <Text variant="rowMeta" weight="semibold" color={status.fg}>
              {summary.status.label}
            </Text>
          </View>
        )}
      </View>
      <Facts summary={summary} skipDate={!!footer} />
      {footer}
    </ListRow>
  );
}

/**
 * The document number, prominent. Above it, a small overline: the document type in its own colour (`kind`)
 * and xserp's DRAFT#/TMP#/PF# prefix as a grey tag.
 */
export function DocCode({ code, kind }: { code: string; kind?: { label: string; tint: string } }) {
  const t = useTheme();
  const styles = useStyles();
  const { tag, number } = splitCode(code);
  return (
    <View style={styles.flex}>
      {(!!kind || !!tag) && (
        <Text variant="overline" color={kind?.tint ?? t.colors.textFaint} numberOfLines={1} style={styles.tag}>
          {kind?.label}
          {!!kind && !!tag && (
            <Text variant="overline" color={t.colors.textFaint}>
              {'  ·  '}
            </Text>
          )}
          {!!tag && (
            <Text variant="overline" color={t.colors.textFaint}>
              {tag}
            </Text>
          )}
        </Text>
      )}
      <Text weight="extrabold" numberOfLines={1} style={styles.code}>
        {number || '—'}
      </Text>
    </View>
  );
}

/** The figure carries the weight; the currency sign sits smaller and lighter, the way a price tag reads. */
export function Amount({ value, symbol }: { value: number; symbol: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Text numberOfLines={1} style={styles.amountWrap}>
      <Text weight="semibold" color={t.colors.textMuted} style={styles.symbol}>
        {value < 0 ? `-${symbol}` : symbol}
      </Text>
      <Text weight="extrabold" color={value === 0 ? t.colors.textMuted : t.colors.text} style={styles.amount}>
        {formatMoney(value, '').replace(/^-/, '')}
      </Text>
    </Text>
  );
}

/** The document date for a card's footer bar: calendar glyph + `30 Sep 2026`, quiet and tabular. */
export function DateLabel({ date }: { date?: string | null }) {
  const t = useTheme();
  const styles = useStyles();
  if (!date) return null;
  return (
    <View style={styles.fact}>
      <Ionicons name="calendar-outline" size={15} color={t.colors.textMuted} />
      <Text variant="label" weight="semibold" color={t.colors.textMuted} style={styles.num} numberOfLines={1}>
        {formatDate(date, 'd MMM yyyy')}
      </Text>
    </View>
  );
}

/** The scan line: date, then a few plain facts split by small dots; wraps to a second line rather than truncating. */
export function Facts({ summary, skipDate }: { summary: ApprovalSummary; skipDate?: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const facts = (summary.meta ?? []).slice(0, MAX_FACTS);
  const showDate = !skipDate && !!summary.date;
  if (!showDate && facts.length === 0) return null;
  return (
    <View style={styles.facts}>
      {showDate && (
        <View style={styles.fact}>
          <Ionicons name="calendar-outline" size={12} color={t.colors.textFaint} />
          <Text variant="caption" color={t.colors.textMuted} style={styles.num}>
            {formatDate(summary.date, 'd MMM yyyy')}
          </Text>
        </View>
      )}
      {facts.map((f, i) => (
        <View key={i} style={[styles.fact, styles.factShrink]}>
          {(showDate || i > 0) && <View style={styles.sep} />}
          <Text
            variant="caption"
            weight={f.tone ? 'semibold' : undefined}
            color={f.tone ? toneColors(t, f.tone).fg : t.colors.textMuted}
            numberOfLines={1}
            style={styles.factText}>
            {f.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  tag: { fontSize: 10, lineHeight: 13, letterSpacing: 0.8, marginBottom: 1 },
  code: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  amountWrap: { flexShrink: 0 },
  symbol: { fontSize: 13, lineHeight: 22 },
  amount: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  kind: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  kindText: { fontSize: 12, lineHeight: 16 },
  num: { fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 3, marginTop: 2 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: t.colors.textFaint, opacity: 0.6, marginRight: 3 },
  factShrink: { maxWidth: '100%', flexShrink: 1 },
  factText: { flexShrink: 1 },
}));
