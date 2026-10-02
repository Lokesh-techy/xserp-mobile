/** @author Lokesh */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Animated from 'react-native-reanimated';

import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { filterItems, normalize, type DateRange } from '@/core/utils';
import { ApprovalCard, openPager } from '@/features/approvals/engine';
import { useMaterialItems, usePartyItems, useProjectItems, useProjects } from '@/features/master-data';
import {
  countActiveFilters,
  FilterSheet,
  QueryState,
  Text,
  useHostRefresh,
  type FilterField,
  type FilterValues,
  type ScrollHost,
  pullable,
  MenuButton,
  useScreenSearch,
  HeaderRight,
} from '@/ui';

import { DEFAULT_PO_FILTERS, type PoFilters } from '../api';
import { poApproval } from '../approvals';
import { usePoSearch } from '../hooks';
import { PO_STATUS_OPTIONS } from '../status';

const LOCAL = [
  { key: 'pending', label: 'Pending' },
  { key: 'part supplied', label: 'Part supplied' },
  { key: 'supplied', label: 'Supplied' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'on time', label: 'On time' },
] as const;

type Props = { host: ScrollHost; filterOpen: boolean; onFilterClose: () => void; onFilterCount: (n: number) => void };

const toValues = (f: PoFilters): FilterValues => ({
  range: f.range,
  status: f.status,
  supplierId: f.supplierId,
  projectId: null,
  itemKey: f.itemId,
});

export function LookupTab({ host, filterOpen, onFilterClose, onFilterCount }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [filters, setFilters] = useState<PoFilters>(DEFAULT_PO_FILTERS);
  const [values, setValues] = useState<FilterValues>(() => toValues(DEFAULT_PO_FILTERS()));
  const [defaults] = useState<FilterValues>(() => toValues(DEFAULT_PO_FILTERS()));
  const [local, setLocal] = useState<string | null>(null);
  const search = useScreenSearch('Search PO, supplier or project');
  const query = usePoSearch(filters);
  const parties = usePartyItems();
  const projects = useProjectItems();
  const projectRows = useProjects();
  const materials = useMaterialItems();
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);

  const fields: FilterField[] = useMemo(
    () => [
      { kind: 'dateRange', key: 'range', label: 'PO date' },
      { kind: 'select', key: 'status', label: 'Status', options: PO_STATUS_OPTIONS },
      { kind: 'picker', key: 'supplierId', label: 'Supplier', items: parties },
      { kind: 'picker', key: 'projectId', label: 'Project', items: projects },
      { kind: 'picker', key: 'itemKey', label: 'Material', items: materials },
    ],
    [parties, projects, materials],
  );

  useEffect(
    () => onFilterCount(countActiveFilters(fields, values, defaults)),
    [fields, values, defaults, onFilterCount],
  );

  const apply = (v: FilterValues) => {
    setValues(v);
    const str = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : null);
    const projectId = str('projectId');
    setFilters({
      ...DEFAULT_PO_FILTERS(),
      range: (v.range as DateRange | undefined) ?? DEFAULT_PO_FILTERS().range,
      status: str('status') ?? '100',
      supplierId: str('supplierId'),
      projectCode: projectId ? (projectRows.find((p) => p.id === projectId)?.code ?? null) : null,
      itemId: str('itemKey')?.split(':')[0] ?? null,
    });
  };

  const all = useMemo(() => query.data ?? [], [query.data]);
  const visible = useMemo(() => {
    const searched = filterItems(all, search, (po) => [po.code, po.supplierName, po.projectName, po.projectCode]);
    if (!local) return searched;
    return searched.filter((po) => normalize(`${po.materialStatus} ${po.deliveryStatus}`).includes(local));
  }, [all, search, local]);

  return (
    <>
      <HeaderRight>
        <MenuButton
          title="Delivery"
          icon="cube-outline"
          options={[{ key: 'any', label: 'Any delivery status', short: 'Delivery' }, ...LOCAL]}
          value={local ?? 'any'}
          onChange={(k) => setLocal(k === 'any' ? null : k)}
        />
      </HeaderRight>
      <QueryState
        query={query}
        wrap={(n) => pullable(host, n)}
        isEmpty={(d) => d.length === 0}
        empty={{
          icon: 'search-outline',
          title: 'No purchase orders',
          message: 'No purchase orders match these filters.',
        }}>
        {() =>
          host.attach(
            <Animated.FlatList
              {...host.scrollProps}
              data={visible}
              keyExtractor={(po) => po.id}
              contentContainerStyle={[styles.pad, styles.grow]}
              initialNumToRender={8}
              windowSize={7}
              ListFooterComponent={
                <Text variant="caption" color={t.colors.textMuted} style={styles.footer}>
                  {visible.length} of {all.length} orders
                </Text>
              }
              renderItem={({ item }) => (
                <ApprovalCard
                  summary={poApproval.summary(item)}
                  tint={t.tints.purchase}
                  onPress={() => openPager(poApproval, visible, item.id)}
                />
              )}
            />,
          )
        }
      </QueryState>
      <FilterSheet
        visible={filterOpen}
        onClose={onFilterClose}
        fields={fields}
        value={values}
        defaults={defaults}
        onApply={apply}
      />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  grow: { flexGrow: 1 },
  footer: { textAlign: 'center', marginTop: 8 },
}));
