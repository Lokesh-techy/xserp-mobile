/** @author Lokesh */
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCan } from '@/core/permissions';
import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { filterItems, type DateRange } from '@/core/utils';
import { ApprovalCard, openPager } from '@/features/approvals/engine';
import { useMaterialItems, usePartyItems, useProjectItems, useProjects } from '@/features/master-data';
import { Button, Chip, countActiveFilters, FilterSheet, QueryState, SearchField, Text, useHostRefresh, type FilterField, type FilterValues, type ScrollHost } from '@/ui';

import { DEFAULT_SALES_FILTERS, type SalesFilters } from '../api';
import { invoiceApproval, oaApproval } from '../approvals';
import { useInvoiceSearch, useOaSearch, useSalesFinanceYears } from '../hooks';
import { INVOICE_STATUS_OPTIONS, OA_STATUS_OPTIONS } from '../status';

type Props = { host: ScrollHost; filterOpen: boolean; onFilterClose: () => void; onFilterCount: (n: number) => void };

const toValues = (f: SalesFilters): FilterValues => ({ range: f.range, status: f.status, financeYear: f.financeYear, partyId: f.partyId, projectId: null, itemKey: f.itemId });

export function LookupTab({ host, filterOpen, onFilterClose, onFilterCount }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const canCreate = useCan('SALES', 'edit');
  const [filters, setFilters] = useState<SalesFilters>(() => DEFAULT_SALES_FILTERS('invoice'));
  const [values, setValues] = useState<FilterValues>(() => toValues(DEFAULT_SALES_FILTERS()));
  const [defaults] = useState<FilterValues>(() => toValues(DEFAULT_SALES_FILTERS()));
  const [search, setSearch] = useState('');
  const invoices = useInvoiceSearch(filters);
  const oas = useOaSearch(filters);
  const fy = useSalesFinanceYears(filters.kind);
  const parties = usePartyItems();
  const projects = useProjectItems();
  const projectRows = useProjects();
  const materials = useMaterialItems();
  const isInvoice = filters.kind === 'invoice';
  const query = isInvoice ? invoices : oas;
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);

  const fields: FilterField[] = useMemo(
    () => [
      { kind: 'dateRange', key: 'range', label: isInvoice ? 'Invoice date' : 'OA date' },
      { kind: 'select', key: 'status', label: 'Status', options: isInvoice ? INVOICE_STATUS_OPTIONS : OA_STATUS_OPTIONS },
      { kind: 'select', key: 'financeYear', label: 'Financial year', options: [{ value: '-1', label: 'Current' }, ...(fy.data ?? []).map((y) => ({ value: y, label: y }))] },
      { kind: 'picker', key: 'partyId', label: 'Customer', items: parties },
      { kind: 'picker', key: 'projectId', label: 'Project', items: projects },
      { kind: 'picker', key: 'itemKey', label: 'Material', items: materials },
    ],
    [isInvoice, fy.data, parties, projects, materials],
  );

  useEffect(() => onFilterCount(countActiveFilters(fields, values, defaults)), [fields, values, defaults, onFilterCount]);

  const apply = (v: FilterValues) => {
    setValues(v);
    const str = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : null);
    const projectId = str('projectId');
    setFilters((f) => ({
      ...f,
      range: (v.range as DateRange | undefined) ?? f.range,
      status: str('status') ?? '100',
      financeYear: str('financeYear') ?? '-1',
      partyId: str('partyId'),
      projectCode: projectId ? (projectRows.find((p) => p.id === projectId)?.code ?? null) : null,
      itemId: str('itemKey')?.split(':')[0] ?? null,
    }));
  };

  const switchKind = (kind: SalesFilters['kind']) => {
    if (kind === filters.kind) return;
    setFilters((f) => ({ ...f, kind, status: '100' }));
    setValues((v) => ({ ...v, status: '100' }));
  };

  const invoiceRows = useMemo(() => filterItems(invoices.data ?? [], search, (i) => [i.code, i.partyName, i.projectName]), [invoices.data, search]);
  const oaRows = useMemo(() => filterItems(oas.data ?? [], search, (o) => [o.code, o.partyName, o.projectName]), [oas.data, search]);
  const total = (isInvoice ? invoices.data : oas.data)?.length ?? 0;
  const shown = isInvoice ? invoiceRows.length : oaRows.length;

  const header = (
    <View style={styles.head}>
      {canCreate && <Button title="Create invoice" icon="add-circle-outline" onPress={() => router.push('/sales/invoice/new')} />}
      <View style={styles.chips}>
        <Chip label="Invoices" icon="receipt-outline" active={isInvoice} onPress={() => switchKind('invoice')} />
        <Chip label="Order acks" icon="document-text-outline" active={!isInvoice} onPress={() => switchKind('oa')} />
      </View>
      <SearchField value={search} onChangeText={setSearch} placeholder={isInvoice ? 'Search invoice, customer or project' : 'Search OA, customer or project'} />
    </View>
  );
  const footer = (
    <Text variant="caption" color={t.colors.textMuted} style={styles.footer}>
      {shown} of {total} {isInvoice ? 'invoices' : 'order acknowledgements'}
    </Text>
  );

  return (
    <>
      {host.attach(
        isInvoice ? (
          <Animated.FlatList
            {...host.scrollProps}
            data={invoiceRows}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.pad}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            ListEmptyComponent={<QueryState query={invoices} isEmpty={() => true} empty={{ icon: 'search-outline', title: 'No invoices', message: 'No invoices match these filters.' }}>{() => null}</QueryState>}
            renderItem={({ item }) => <ApprovalCard summary={invoiceApproval.summary(item)} tint={t.tints.sales} onPress={() => openPager(invoiceApproval, invoiceRows, item.id)} />}
          />
        ) : (
          <Animated.FlatList
            {...host.scrollProps}
            data={oaRows}
            keyExtractor={(o) => o.id}
            contentContainerStyle={styles.pad}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            ListEmptyComponent={<QueryState query={oas} isEmpty={() => true} empty={{ icon: 'search-outline', title: 'No order acknowledgements', message: 'Nothing matches these filters.' }}>{() => null}</QueryState>}
            renderItem={({ item }) => <ApprovalCard summary={oaApproval.summary(item)} tint={t.tints.sales} onPress={() => openPager(oaApproval, oaRows, item.id)} />}
          />
        ),
      )}
      <FilterSheet visible={filterOpen} onClose={onFilterClose} fields={fields} value={values} defaults={defaults} onApply={apply} />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  head: { gap: 12, marginBottom: 14 },
  chips: { flexDirection: 'row', gap: 8 },
  footer: { textAlign: 'center', marginTop: 8 },
}));
