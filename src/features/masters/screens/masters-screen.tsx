/** @author Lokesh */
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useCan } from '@/core/permissions';
import { QueueList, useApprovalQueue } from '@/features/approvals/engine';
import { materialKey, useMaterials, useParties, type MaterialName, type Party } from '@/features/master-data';
import { MenuButton, ModuleScreen, SegmentedTabs, useTabParam, type RowEdge, type ScrollHost } from '@/ui';

import { rateApproval } from '../approvals';
import { DashboardTab } from '../components/dashboard-tab';
import { MasterList } from '../components/master-list';
import { MaterialRow } from '../components/material-row';
import { PartyRow } from '../components/party-row';
import {
  filterMaterials,
  materialSearchFields,
  STOCK_FILTERS,
  stockCounts,
  type StockFilter,
} from '../material-filter';

const TABS = ['dashboard', 'parties', 'materials', 'rates'] as const;

export function MastersScreen() {
  const [tab, setTab] = useTabParam(TABS, 'dashboard');
  const canApprove = useCan('MASTERS', 'approve');
  const rates = useApprovalQueue(rateApproval, canApprove);
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard' },
    { key: 'parties' as const, label: 'Parties' },
    { key: 'materials' as const, label: 'Materials' },
    ...(canApprove ? [{ key: 'rates' as const, label: 'Rate approval', badge: rates.data?.length }] : []),
  ];
  return (
    <ModuleScreen title="Masters" tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}>
      {(host) =>
        tab === 'rates' && canApprove ? (
          <QueueList config={rateApproval} host={host} />
        ) : tab === 'materials' ? (
          <MaterialsTab host={host} />
        ) : tab === 'parties' ? (
          <PartiesTab host={host} />
        ) : (
          <DashboardTab host={host} />
        )
      }
    </ModuleScreen>
  );
}

const openParty = (p: Party) => router.push({ pathname: '/masters/party/[id]', params: { id: p.id } });
const openMaterial = (m: MaterialName) =>
  router.push({ pathname: '/masters/material/[id]', params: { id: materialKey(m.itemId, m.makeId) } });

const partyName = (p: Party) => p.name;
const partyKey = (p: Party) => p.id;
const partySearch = (p: Party) => [p.name, p.code];
const materialName = (m: MaterialName) => m.name;
const materialId = (m: MaterialName) => materialKey(m.itemId, m.makeId);

function PartiesTab({ host }: { host: ScrollHost }) {
  const parties = useParties();
  const renderRow = useCallback((p: Party, edge: RowEdge) => <PartyRow party={p} edge={edge} onOpen={openParty} />, []);
  return (
    <MasterList
      host={host}
      kind="parties"
      items={parties}
      total={parties.length}
      noun="parties"
      nameOf={partyName}
      keyOf={partyKey}
      searchOf={partySearch}
      renderRow={renderRow}
    />
  );
}

function MaterialsTab({ host }: { host: ScrollHost }) {
  const materials = useMaterials();
  const [filter, setFilter] = useState<StockFilter>('all');
  const counts = useMemo(() => stockCounts(materials), [materials]);
  const shown = useMemo(() => filterMaterials(materials, filter), [materials, filter]);
  const renderRow = useCallback(
    (m: MaterialName, edge: RowEdge) => <MaterialRow material={m} edge={edge} onOpen={openMaterial} />,
    [],
  );
  return (
    <MasterList
      host={host}
      kind="materials"
      items={shown}
      total={materials.length}
      noun="materials"
      nameOf={materialName}
      keyOf={materialId}
      searchOf={materialSearchFields}
      renderRow={renderRow}
      control={
        <MenuButton
          title="Stock"
          icon="funnel-outline"
          options={STOCK_FILTERS.map((f) => ({
            key: f.key,
            label: f.label,
            detail: counts[f.key].toLocaleString('en-IN'),
          }))}
          value={filter}
          onChange={(k) => setFilter(k as StockFilter)}
        />
      }
    />
  );
}
