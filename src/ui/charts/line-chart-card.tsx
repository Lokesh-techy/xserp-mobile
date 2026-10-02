/** @author Lokesh */
import { useState } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';

import { Card } from '../card';
import { Text } from '../text';

type Props = { title: string; data: { label: string; value: number }[]; format?: (n: number) => string };

export function LineChartCard({ title, data, format = (n) => formatCompact(n, '') }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const points = data.map((d) => ({ value: d.value, label: d.label, labelTextStyle: { color: t.colors.textMuted, fontSize: 10 } }));
  return (
    <Card style={styles.card}>
      <Text variant="heading">{title}</Text>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && points.length > 1 ? (
          <LineChart
            data={points}
            width={width - 40}
            height={160}
            color={t.colors.accent}
            thickness={2.5}
            curved
            areaChart
            startFillColor={t.colors.accent}
            endFillColor={t.colors.surface}
            startOpacity={0.25}
            endOpacity={0}
            dataPointsColor={t.colors.primary}
            yAxisThickness={0}
            xAxisColor={t.colors.border}
            rulesColor={t.colors.divider}
            yAxisTextStyle={{ color: t.colors.textFaint, fontSize: 10 }}
            formatYLabel={(v: string) => format(Number(v))}
            spacing={Math.max(30, (width - 60) / points.length)}
          />
        ) : (
          <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
            Not enough history yet
          </Text>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: 12 },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
