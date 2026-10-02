/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { PressableScale, Text } from '@/ui';

import type { ApprovalSummary } from './types';

type Props = {
  summary: ApprovalSummary;
  /** Stripe colour (document type or module). */
  tint: string;
  onPress?: () => void;
  /** Off for pending queues, where every item has the same status anyway. */
  showStatus?: boolean;
  /** Document-type chip, for lists that mix types (e.g. the review list). */
  kind?: string;
};

/**
 * Compact document row: type · code · amount on top, party · project · date beneath.
 * Two lines carry everything; spacing stays generous so it still breathes.
 */
export function ApprovalCard({ summary, tint, onPress, showStatus = true, kind }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const status = toneColors(t, summary.status.tone);
  const project = summary.meta?.[0]?.text;
  return (
    <PressableScale onPress={onPress} disabled={!onPress} style={styles.card} scaleTo={0.985}>
      <View style={[styles.stripe, { backgroundColor: tint }]} />
      <View style={styles.row}>
        {!!kind && (
          <View style={[styles.kind, { backgroundColor: `${tint}1F` }]}>
            <Text variant="caption" weight="bold" color={tint} style={styles.kindText}>
              {kind}
            </Text>
          </View>
        )}
        <Text variant="label" weight="bold" numberOfLines={1} style={styles.flex}>
          {summary.code}
        </Text>
        {typeof summary.amount === 'number' && (
          <Text variant="label" weight="extrabold" style={styles.amount}>
            {formatMoney(summary.amount, summary.currency || '₹')}
          </Text>
        )}
      </View>
      <View style={styles.row}>
        <Text variant="caption" color={t.colors.textMuted} numberOfLines={1} style={styles.flex}>
          {[summary.party || '—', project].filter(Boolean).join(' · ')}
        </Text>
        {showStatus ? (
          <View style={styles.status}>
            <View style={[styles.dot, { backgroundColor: status.fg }]} />
            <Text variant="caption" weight="semibold" color={status.fg}>
              {summary.status.label}
            </Text>
          </View>
        ) : (
          <Text variant="caption" color={t.colors.textFaint}>
            {formatDate(summary.date, 'd MMM')}
          </Text>
        )}
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 14,
    marginBottom: 8,
    gap: 5,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  kind: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6 },
  kindText: { fontSize: 11, lineHeight: 15 },
  amount: { fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
}));
