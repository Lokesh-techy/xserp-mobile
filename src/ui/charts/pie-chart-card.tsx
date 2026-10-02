/** @author Lokesh */
import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';

import { Card } from '../card';
import { Text } from '../text';

type Props = { title: string; data: { label: string; value: number }[]; format?: (n: number) => string };

export function PieChartCard({ title, data, format = (n) => formatCompact(n) }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const slices = data.filter((d) => d.value > 0).map((d, i) => ({ value: d.value, color: t.chart[i % t.chart.length] ?? t.colors.accent, label: d.label }));
  const total = slices.reduce((s, d) => s + d.value, 0);
  return (
    <Card style={styles.card}>
      <Text variant="heading">{title}</Text>
      {slices.length === 0 ? (
        <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
          No data for this period
        </Text>
      ) : (
        <View style={styles.row}>
          <PieChart
            data={slices}
            donut
            radius={70}
            innerRadius={46}
            innerCircleColor={t.colors.surface}
            centerLabelComponent={() => (
              <Text variant="label" style={styles.center}>
                {format(total)}
              </Text>
            )}
          />
          <View style={styles.legend}>
            {slices.map((s) => (
              <View key={s.label} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text variant="caption" style={styles.flex} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text variant="caption" color={t.colors.textMuted}>
                  {Math.round((s.value / total) * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
