/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney } from '@/core/utils';
import { Bone, Card, PressableScale, Section, Text } from '@/ui';

import type { LineItem } from './types';

type Props = { lines: LineItem[]; loading: boolean; onPress?: (key: string) => void };

export function LineItemsCard({ lines, loading, onPress }: Props) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Section title={`Items${lines.length ? ` · ${lines.length}` : ''}`}>
      <Card style={styles.card}>
        {loading && lines.length === 0 ? (
          <View style={styles.loading}>
            <Bone style={{ width: '80%', height: 14 }} />
            <Bone style={{ width: '60%', height: 14 }} />
          </View>
        ) : lines.length === 0 ? (
          <Text variant="body" color={t.colors.textMuted}>
            No line items
          </Text>
        ) : (
          lines.map((line, i) => {
            const body = (
              <View style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="label" numberOfLines={2}>
                    {line.title}
                  </Text>
                  {!!line.subtitle && (
                    <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                      {line.subtitle}
                    </Text>
                  )}
                </View>
                <View style={styles.right}>
                  {!!line.qty && (
                    <Text variant="caption" color={t.colors.textMuted}>
                      {line.qty}
                    </Text>
                  )}
                  {typeof line.amount === 'number' && (
                    <Text variant="label" weight="bold">
                      {formatMoney(line.amount, line.currency || '₹')}
                    </Text>
                  )}
                </View>
                {onPress && <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />}
              </View>
            );
            return onPress ? (
              <PressableScale key={`${line.key}:${i}`} onPress={() => onPress(line.key)} scaleTo={0.99}>
                {body}
              </PressableScale>
            ) : (
              <View key={`${line.key}:${i}`}>{body}</View>
            );
          })
        )}
      </Card>
    </Section>
  );
}

const useStyles = makeStyles((t) => ({
  card: { paddingVertical: 6 },
  loading: { gap: 10, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: t.colors.divider },
  flex: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
}));
