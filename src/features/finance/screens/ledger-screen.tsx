/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney, thisMonth } from '@/core/utils';
import {
  Bone,
  Card,
  edgeOf,
  HeaderRight,
  KeyValue,
  ListRow,
  ModuleScreen,
  isSwitching,
  ListSkeleton,
  QueryState,
  RangeChips,
  Section,
  StatCard,
  StateView,
  Text,
  useHostRefresh,
  type ScrollHost,
} from '@/ui';

import { fetchLedgerBills, fetchLedgerData } from '../api';
import { isReceivableGroup } from '../buckets';
import { financeKeys } from '../keys';

type Props = { id: string; name: string; group: string };

export function LedgerScreen(props: Props) {
  return (
    <ModuleScreen title={props.name || 'Ledger'} subtitle={props.group}>
      {(host) => <Body host={host} {...props} />}
    </ModuleScreen>
  );
}

function Body({ host, id, group }: Props & { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const [range, setRange] = useState(() => thisMonth());
  const receivable = isReceivableGroup(group);
  const data = useQuery({
    queryKey: financeKeys.ledger(id, range),
    queryFn: () => fetchLedgerData(id, range),
    placeholderData: (p) => p,
  });
  const bills = useQuery({
    queryKey: financeKeys.bills(id),
    queryFn: () => fetchLedgerBills(id, receivable!),
    enabled: receivable !== null,
  });
  useHostRefresh(
    host,
    useCallback(
      () => Promise.all([data.refetch(), receivable !== null ? bills.refetch() : null]),
      [data, bills, receivable],
    ),
  );
  return host.attach(
    <Animated.FlatList
      {...host.scrollProps}
      data={isSwitching(data) ? [] : (data.data?.vouchers ?? [])}
      keyExtractor={(v, i) => `${v.code}-${i}`}
      contentContainerStyle={styles.pad}
      ListHeaderComponent={
        <View style={styles.head}>
          <HeaderRight>
            <RangeChips value={range} onChange={setRange} fyStartDay={fy} />
          </HeaderRight>
          <QueryState
            query={data}
            skeleton={
              <View style={styles.grid}>
                <Bone style={styles.statBone} />
                <Bone style={styles.statBone} />
              </View>
            }>
            {(d) => (
              <View style={styles.grid}>
                <StatCard label="Opening" value={formatMoney(d.opening_balance)} icon="log-in-outline" tone="neutral" />
                <StatCard label="Closing" value={formatMoney(d.closing_balance)} icon="log-out-outline" tone="info" />
              </View>
            )}
          </QueryState>
          {receivable !== null && bills.data && bills.data.bills.length > 0 && (
            <Section title={`Open bills · ${formatMoney(bills.data.unsettled)}`}>
              <Card>
                {bills.data.bills.slice(0, 20).map((b, i) => (
                  <KeyValue
                    key={`${b.bill_no}-${i}`}
                    label={`${b.bill_no || '—'} · ${formatDate(b.bill_date)}`}
                    value={formatMoney(b.balance || b.value)}
                  />
                ))}
              </Card>
            </Section>
          )}
          <Section title="Vouchers">
            <View />
          </Section>
        </View>
      }
      ListEmptyComponent={
        data.isPending || isSwitching(data) ? (
          <ListSkeleton rows={4} />
        ) : (
          <StateView icon="document-outline" title="No vouchers in this period" />
        )
      }
      renderItem={({ item, index }) => (
        <ListRow edge={edgeOf(index, data.data?.vouchers.length ?? 0)} style={styles.voucher}>
          <View style={styles.flex}>
            <Text variant="rowTitle">{item.code}</Text>
            <Text variant="rowMeta" color={t.colors.textMuted}>
              {formatDate(item.date)}
            </Text>
          </View>
          <Text variant="rowTitle" weight="bold" color={item.is_debit ? t.colors.danger : t.colors.success}>
            {formatMoney(item.value)} {item.is_debit ? 'Dr' : 'Cr'}
          </Text>
        </ListRow>
      )}
    />,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  head: { gap: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  statBone: { flex: 1, height: 84, borderRadius: t.radius.lg },
  voucher: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
}));
