/** @author Lokesh */
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { useFocusRefetch } from '@/core/query';
import { makeStyles } from '@/core/theme';
import { formatCompact, lastDays } from '@/core/utils';
import {
  BarChartCard,
  PieChartCard,
  QueryState,
  RangeChips,
  Section,
  StatCard,
  useHostRefresh,
  type ScrollHost,
  HeaderRight,
} from '@/ui';

import { useStockStatement, useStoreDashboard } from '../hooks';

export function StockTab({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const [range, setRange] = useState(() => lastDays(30));
  const dash = useStoreDashboard(range);
  const statement = useStockStatement(range);
  const refetch = useCallback(() => Promise.all([dash.refetch(), statement.refetch()]), [dash, statement]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <HeaderRight>
        <RangeChips value={range} onChange={setRange} fyStartDay={fy} />
      </HeaderRight>
      <QueryState query={dash}>
        {(d) => {
          const s = statement.data ?? d.stock_statement;
          return (
            <>
              {s && (
                <Section title="Stock statement">
                  <View style={styles.grid}>
                    <StatCard
                      label="Opening"
                      value={formatCompact(s.opening_stock)}
                      icon="archive-outline"
                      tone="neutral"
                    />
                    <StatCard
                      label="Receipts"
                      value={formatCompact(s.stock_receipt)}
                      icon="arrow-down-circle-outline"
                      tone="success"
                    />
                    <StatCard
                      label="Issues"
                      value={formatCompact(s.stock_issues)}
                      icon="arrow-up-circle-outline"
                      tone="warning"
                    />
                    <StatCard label="Closing" value={formatCompact(s.closing_stock)} icon="cube-outline" tone="info" />
                  </View>
                </Section>
              )}
              <Section title="Composition">
                <View style={styles.charts}>
                  <PieChartCard
                    title="Stock mix"
                    data={d.stock_mix.map((m) => ({ label: m.category, value: m.value }))}
                  />
                  <BarChartCard
                    title="Monthly closing stock"
                    series={[{ label: 'Closing stock' }]}
                    data={d.monthly_closing_stock.map((m) => ({ label: m.month, values: [m.closing_stock] }))}
                  />
                </View>
              </Section>
            </>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  charts: { gap: 14 },
}));
