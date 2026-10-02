/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { useCan } from '@/core/permissions';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney, lastDays, type DateRange } from '@/core/utils';
import {
  Button,
  Card,
  ModuleScreen,
  QueryState,
  RangeChips,
  type ScrollHost,
  SegmentedTabs,
  StatusPill,
  Text,
  useHostRefresh,
  useTabParam,
  withPressFeel,
  HeaderRight,
} from '@/ui';

import { fetchExpenseGroups, fetchExpenses } from '../api';
import { expenseKeys } from '../keys';
import { expenseStatus, STATUS, type ExpenseStatus } from '../status';

const TABS = ['draft', 'confirmed', 'approved', 'checked', 'verified'] as const;
const TAB_STATUS: Record<(typeof TABS)[number], ExpenseStatus> = {
  draft: STATUS.DRAFT,
  confirmed: STATUS.CONFIRMED,
  approved: STATUS.APPROVED,
  checked: STATUS.CHECKED,
  verified: STATUS.VERIFIED,
};

export function ExpensesScreen() {
  const [tab, setTab] = useTabParam(TABS, 'draft');
  const groups = useQuery({ queryKey: expenseKeys.groups(), queryFn: fetchExpenseGroups });
  const g = groups.data;
  const tabs = [
    { key: 'draft' as const, label: 'Draft', badge: g?.Draft.length },
    { key: 'confirmed' as const, label: 'Confirmed', badge: g?.Confirmed.length },
    { key: 'approved' as const, label: 'Approved', badge: g?.Approved.length },
    { key: 'checked' as const, label: 'Checked', badge: g?.Checked.length },
    { key: 'verified' as const, label: 'Verified' },
  ];
  return (
    <ModuleScreen title="Expenses" tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}>
      {(host) => <ExpenseList key={tab} host={host} status={TAB_STATUS[tab]} onRefreshGroups={groups.refetch} />}
    </ModuleScreen>
  );
}

function ExpenseList({
  host,
  status,
  onRefreshGroups,
}: {
  host: ScrollHost;
  status: ExpenseStatus;
  onRefreshGroups: () => Promise<unknown>;
}) {
  const t = useTheme();
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const canCreate = useCan('EXPENSES', 'edit');
  const [range, setRange] = useState<DateRange>(() => lastDays(30));
  const query = useQuery({
    queryKey: expenseKeys.list(status, range),
    queryFn: () => fetchExpenses(status, range),
    placeholderData: (p) => p,
  });
  const refetch = useCallback(() => Promise.all([query.refetch(), onRefreshGroups()]), [query, onRefreshGroups]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={query.data ?? []}
      keyExtractor={(e) => e.id}
      contentContainerStyle={styles.pad}
      ListHeaderComponent={
        <View style={styles.head}>
          {canCreate && status === STATUS.DRAFT && (
            <Button
              title="New expense"
              icon="add-circle-outline"
              onPress={withPressFeel(() => router.push({ pathname: '/expenses/[id]', params: { id: 'new' } }))}
            />
          )}
          <HeaderRight>
            <RangeChips value={range} onChange={setRange} fyStartDay={fy} />
          </HeaderRight>
        </View>
      }
      ListEmptyComponent={
        <QueryState
          query={query}
          isEmpty={() => true}
          empty={{
            icon: 'receipt-outline',
            title: 'No claims here',
            message: 'Nothing in this status for the selected period.',
          }}>
          {() => null}
        </QueryState>
      }
      renderItem={({ item }) => {
        const st = expenseStatus(item.status);
        return (
          <Card
            tint={t.tints.expenses}
            style={styles.card}
            onPress={() => router.push({ pathname: '/expenses/[id]', params: { id: item.id } })}>
            <View style={styles.row}>
              <Text variant="heading" style={styles.flex} numberOfLines={1}>
                {item.code || `Draft #${item.id}`}
              </Text>
              <StatusPill label={st.label} tone={st.tone} />
            </View>
            <Text variant="rowMeta" color={t.colors.textMuted} numberOfLines={1}>
              {[item.claimant, item.description].filter(Boolean).join(' · ') || '—'}
            </Text>
            <View style={styles.row}>
              <Text variant="rowMeta" color={t.colors.textMuted} style={styles.flex}>
                {formatDate(item.date)}
              </Text>
              <Text variant="heading" style={styles.amount}>
                {formatMoney(item.approved || item.claimed)}
              </Text>
            </View>
          </Card>
        );
      }}
    />,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  head: { gap: 12, marginBottom: 12 },
  card: { marginBottom: 12, paddingLeft: 20, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  amount: { fontSize: 17 },
}));
