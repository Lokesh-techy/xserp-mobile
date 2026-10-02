/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney } from '@/core/utils';
import { Card, QueryState, SegmentedControl, Section, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { fetchAging } from '../api';
import { BUCKETS, bucketAmount, bucketParam } from '../buckets';
import { financeKeys } from '../keys';

export function AgeingTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const [receivable, setReceivable] = useState(true);
  const query = useQuery({ queryKey: financeKeys.aging(), queryFn: fetchAging });
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <View style={styles.chips}>
        <SegmentedControl options={[{ key: 'r', label: 'Receivable' }, { key: 'p', label: 'Payable' }]} value={receivable ? 'r' : 'p'} onChange={(k) => setReceivable(k === 'r')} />
      </View>
      <QueryState query={query}>
        {(d) => {
          const a = receivable ? d.receivable_aging : d.payable_aging;
          if (!a) return null;
          const max = Math.max(1, ...BUCKETS.map((b) => bucketAmount(a, b.key)));
          return (
            <Section title={`${receivable ? 'Receivable' : 'Payable'} · total ${formatMoney(a.total)}`}>
              {BUCKETS.map((b) => {
                const amount = bucketAmount(a, b.key);
                return (
                  <Card key={b.key} style={styles.card} onPress={() => router.push({ pathname: '/finance/aging/[bucket]', params: { bucket: bucketParam(receivable, b.key) } })}>
                    <View style={styles.row}>
                      <Text variant="label" style={styles.flex}>
                        {b.label}
                      </Text>
                      <Text variant="heading">{formatMoney(amount)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${(amount / max) * 100}%`, backgroundColor: b.key === 'age4' ? t.colors.danger : t.tints.finance }]} />
                    </View>
                  </Card>
                );
              })}
              <Text variant="caption" color={t.colors.danger}>
                Overdue {formatMoney(a.overdue)}
              </Text>
            </Section>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  chips: { marginBottom: 4 },
  card: { marginBottom: 10, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: t.colors.fill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
}));
