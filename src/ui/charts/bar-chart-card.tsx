/** @author Lokesh */
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';

import { Card } from '../card';
import { Text } from '../text';

type Props = {
  title: string;
  subtitle?: string;
  data: { label: string; values: number[] }[];
  series: { label: string; color?: string }[];
  format?: (n: number) => string;
};

/** Grouped bars (one group per label). Colours come from the theme's chart palette. */
export function BarChartCard({ title, subtitle, data, series, format = (n) => formatCompact(n, '') }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const colors = series.map((s, i) => s.color ?? t.chart[i % t.chart.length] ?? t.colors.accent);
  const bars = data.flatMap((d) =>
    d.values.map((v, i) => ({
      value: v,
      frontColor: colors[i],
      label: i === 0 ? d.label : undefined,
      spacing: i === d.values.length - 1 ? 18 : 2,
      labelWidth: 40,
      labelTextStyle: { color: t.colors.textMuted, fontSize: 10, fontFamily: t.fonts.medium },
    })),
  );
  return (
    <Card style={styles.card}>
      <Text variant="heading">{title}</Text>
      {!!subtitle && (
        <Text variant="caption" color={t.colors.textMuted}>
          {subtitle}
        </Text>
      )}
      <View style={styles.legend}>
        {series.map((s, i) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors[i] }]} />
            <Text variant="caption" color={t.colors.textMuted}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && bars.length > 0 && (
          <BarChart
            data={bars}
            width={width - 40}
            height={170}
            barWidth={Math.max(6, Math.min(14, (width - 60) / bars.length - 4))}
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={t.colors.border}
            rulesColor={t.colors.divider}
            rulesType="solid"
            yAxisTextStyle={{ color: t.colors.textFaint, fontSize: 10 }}
            formatYLabel={(v: string) => format(Number(v))}
            isAnimated
          />
        )}
        {bars.length === 0 && (
          <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
            No data for this period
          </Text>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
