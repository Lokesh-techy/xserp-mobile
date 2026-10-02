/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { Card, StatusPill, Text } from '@/ui';

import type { ApprovalSummary } from './types';

export function ApprovalCard({ summary, tint, onPress }: { summary: ApprovalSummary; tint: string; onPress?: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Card tint={tint} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text variant="heading" numberOfLines={1} style={styles.flex}>
          {summary.code}
        </Text>
        <StatusPill label={summary.status.label} tone={summary.status.tone} />
      </View>
      <View style={styles.party}>
        <Ionicons name="business-outline" size={14} color={t.colors.textMuted} />
        <Text variant="label" color={t.colors.textMuted} numberOfLines={1} style={styles.flex}>
          {summary.party || '—'}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={styles.meta}>
          <Text variant="caption" color={t.colors.textMuted}>
            {formatDate(summary.date)}
          </Text>
          {summary.meta?.slice(0, 1).map((m) => (
            <View key={m.text} style={styles.metaItem}>
              <Ionicons name={m.icon} size={12} color={t.colors.textFaint} />
              <Text variant="caption" color={t.colors.textFaint} numberOfLines={1}>
                {m.text}
              </Text>
            </View>
          ))}
        </View>
        {typeof summary.amount === 'number' && (
          <Text variant="heading" style={styles.amount}>
            {formatMoney(summary.amount, summary.currency || '₹')}
          </Text>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { marginBottom: 12, paddingLeft: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
  party: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { height: 1, backgroundColor: t.colors.divider, marginVertical: 2 },
  meta: { flex: 1, gap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: 17 },
}));
