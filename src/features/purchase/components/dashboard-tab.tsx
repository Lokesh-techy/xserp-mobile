/** @author Lokesh */
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusRefetch } from '@/core/query';
import { makeStyles } from '@/core/theme';
import { BarChartCard, QueryState, Section, StatCard, useHostRefresh, type ScrollHost } from '@/ui';

import { usePurchaseDashboard } from '../hooks';

export function DashboardTab({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const query = usePurchaseDashboard();
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>
        {(d) => (
          <>
            <Section title="Purchase orders">
              <View style={styles.grid}>
                <StatCard label="Pending" value={String(d.pending)} icon="time-outline" tone="warning" caption={`${d.pending_delayed} delayed`} />
                <StatCard label="On track" value={String(d.pending_on_track)} icon="checkmark-circle-outline" tone="success" />
                <StatCard label="Part supplied" value={String(d.part_supplied)} icon="git-branch-outline" tone="info" caption={`${d.part_delayed} delayed`} />
                <StatCard label="Part on track" value={String(d.part_on_track)} icon="trending-up-outline" tone="success" />
              </View>
            </Section>
            <Section title="Indents">
              <View style={styles.grid}>
                <StatCard label="Pending" value={String(d.indent_pending)} icon="document-text-outline" tone="warning" />
                <StatCard label="Due for PO" value={String(d.indent_due_po)} icon="cart-outline" tone="danger" />
                <StatCard label="Due for material" value={String(d.indent_due_material)} icon="cube-outline" tone="violet" />
                <StatCard label="Raised" value={String(d.indent_raised)} icon="add-circle-outline" tone="info" />
              </View>
            </Section>
            <Section title="Delivery performance">
              <BarChartCard
                title="On time vs delayed"
                subtitle="Purchase orders by month"
                format={(n) => String(Math.round(n))}
                series={[{ label: 'On time' }, { label: 'Delayed', color: '#D9534F' }]}
                data={d.performance.map((p) => ({ label: p.po_month, values: [p.on_time, p.delayed] }))}
              />
            </Section>
          </>
        )}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingTop: 0, paddingBottom: 48 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } }));
