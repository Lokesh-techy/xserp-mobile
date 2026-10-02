/** @author Lokesh */
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusRefetch } from '@/core/query';
import { makeStyles } from '@/core/theme';
import { formatCompact, formatMoney, lastDays } from '@/core/utils';
import { BarChartCard, Card, KeyValue, QueryState, Section, StatCard, useHostRefresh, type ScrollHost } from '@/ui';

import { useReceivableAging, useSalesDashboard, useSalesDetail } from '../hooks';

export function DashboardTab({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const [range] = useState(() => lastDays(30));
  const query = useSalesDashboard();
  const detail = useSalesDetail(range);
  const aging = useReceivableAging();
  const refetch = useCallback(() => Promise.all([query.refetch(), detail.refetch(), aging.refetch()]), [query, detail, aging]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  const a = aging.data;
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>
        {(d) => (
          <>
            <Section title="Order acknowledgements">
              <View style={styles.grid}>
                <StatCard label="OA pending" value={String(d.oa_pending)} icon="time-outline" tone="warning" />
                <StatCard label="On track" value={String(d.oa_on_track)} icon="checkmark-circle-outline" tone="success" />
                <StatCard label="Overdue" value={String(d.oa_overdue)} icon="alert-circle-outline" tone="danger" />
                <StatCard label="Invoices delayed" value={String(d.pending_delayed)} icon="hourglass-outline" tone="violet" caption={`${d.pending_on_track} on track`} />
              </View>
            </Section>
            {detail.data && (
              <Section title="Last 30 days">
                <View style={styles.grid}>
                  <StatCard label="Collected on time" value={formatCompact(detail.data.collection_on_time)} icon="cash-outline" tone="success" />
                  <StatCard label="Collected late" value={formatCompact(detail.data.collection_delayed)} icon="cash-outline" tone="warning" />
                </View>
              </Section>
            )}
            <Section title="Performance">
              <View style={styles.charts}>
                <BarChartCard title="Sales" subtitle="Invoiced value by month" series={[{ label: 'Sales' }]} data={d.sales_performance.map((m) => ({ label: m.month, values: [m.value] }))} />
                <BarChartCard title="Delivery" subtitle="Orders on time vs delayed" format={(n) => String(Math.round(n))} series={[{ label: 'On time' }, { label: 'Delayed', color: '#D9534F' }]} data={d.delivery_performance.map((m) => ({ label: m.month, values: [m.on_time, m.delayed] }))} />
                <BarChartCard title="Collections" subtitle="Payments received vs advances" series={[{ label: 'Collected' }, { label: 'Advance' }]} data={d.payment_collection.map((m) => ({ label: m.month, values: [m.value, m.advance] }))} />
              </View>
            </Section>
            {a && (
              <Section title="Receivable ageing">
                <Card>
                  <KeyValue label="0–30 days" value={formatMoney(a.age1)} />
                  <KeyValue label="31–60 days" value={formatMoney(a.age2)} />
                  <KeyValue label="61–90 days" value={formatMoney(a.age3)} />
                  <KeyValue label="90+ days" value={formatMoney(a.age4)} />
                  <KeyValue label="Overdue" value={formatMoney(a.overdue)} />
                </Card>
              </Section>
            )}
          </>
        )}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingTop: 0, paddingBottom: 48 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, charts: { gap: 14 } }));
