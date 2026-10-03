/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { ListRow, Text, type RowEdge } from '@/ui';

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
};

/** How many facts a row shows besides the date; the rest live on the detail screen. */
const MAX_FACTS = 3;

/**
 * Document row in three tiers: what it is and what it's worth, who it's with (and its status),
 * then the facts you scan for — the labelled date first, then project, delivery, due date…
 */
export function ApprovalCard({ summary, tint, onPress, showStatus = true, kind, edge }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const status = toneColors(t, summary.status.tone);
  return (
    <ListRow edge={edge} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        {!!kind && (
          <View style={[styles.kind, { backgroundColor: `${tint}1F` }]}>
            <Text variant="caption" weight="bold" color={tint} style={styles.kindText}>
              {kind}
            </Text>
          </View>
        )}
        <Text variant="rowTitle" weight="bold" numberOfLines={1} style={styles.flex}>
          {summary.code}
        </Text>
        {typeof summary.amount === 'number' && (
          <Text variant="rowTitle" weight="extrabold" style={styles.num}>
            {formatMoney(summary.amount, summary.currency || '₹')}
          </Text>
        )}
      </View>
      <View style={styles.row}>
        <Text variant="rowMeta" color={t.colors.textMuted} numberOfLines={1} style={styles.flex}>
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
      <Facts summary={summary} />
    </ListRow>
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
