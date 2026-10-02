/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact, formatDate, formatMoney, thisMonth } from '@/core/utils';
import { BarChartCard, Card, KeyValue, QueryState, RangeChips, Section, StatCard, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { fetchFinanceDashboard, fetchIncomeExpenses } from '../api';
import { financeKeys } from '../keys';

export function DashboardTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const [range, setRange] = useState(() => thisMonth());
  const dash = useQuery({ queryKey: financeKeys.dashboard(range), queryFn: () => fetchFinanceDashboard(range), placeholderData: (p) => p });
  const ie = useQuery({ queryKey: financeKeys.incomeExpenses(), queryFn: fetchIncomeExpenses });
  const refetch = useCallback(() => Promise.all([dash.refetch(), ie.refetch()]), [dash, ie]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <RangeChips value={range} onChange={setRange} fyStartDay={fy} nested={host.nestedProps} />
      <QueryState query={dash}>
        {(d) => (
          <>
            <Section title="Position">
              <View style={styles.grid}>
                <StatCard label="Bank" value={formatCompact(d.bank_balance || d.bank)} icon="business-outline" tone="info" />
                <StatCard label="Cash in hand" value={formatCompact(d.cash_in_hand || d.cash)} icon="cash-outline" tone="success" />
                <StatCard label="Receivables" value={formatCompact(d.receivable)} icon="arrow-down-circle-outline" tone="violet" />
                <StatCard label="Payables" value={formatCompact(d.payable)} icon="arrow-up-circle-outline" tone="warning" />
                <StatCard label="Tax liability" value={formatCompact(d.tax_liability)} icon="document-text-outline" tone="danger" />
                <StatCard label="Sales revenue" value={formatCompact(d.sales_revenue)} icon="trending-up-outline" tone="success" />
              </View>
            </Section>
            {d.receivables.length > 0 && (
              <Section title="Top receivables">
                <Card>
                  {d.receivables.slice(0, 5).map((r) => (
                    <KeyValue key={r.id || r.name} label={r.name} value={formatMoney(r.value)} />
                  ))}
                </Card>
              </Section>
            )}
            {d.payables.length > 0 && (
              <Section title="Top payables">
                <Card>
                  {d.payables.slice(0, 5).map((r) => (
                    <KeyValue key={r.id || r.name} label={r.name} value={formatMoney(r.value)} />
                  ))}
                </Card>
              </Section>
            )}
            {!!d.sync_datetime && (
              <Text variant="caption" color={t.colors.textMuted} style={styles.sync}>
                Synced {formatDate(d.sync_datetime, 'dd MMM yyyy, HH:mm')}
              </Text>
            )}
          </>
        )}
      </QueryState>
      {ie.data && (
        <Section title="Trend">
          <BarChartCard title="Income vs expense" series={[{ label: 'Income', color: t.colors.success }, { label: 'Expense', color: t.colors.danger }]} data={ie.data.map((m) => ({ label: m.month, values: [m.income, m.expense] }))} />
        </Section>
      )}
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, sync: { textAlign: 'center', marginTop: 12 } }));
