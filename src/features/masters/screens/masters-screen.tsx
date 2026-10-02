/** @author Lokesh */
import { router } from 'expo-router';

import { useCan } from '@/core/permissions';
import { QueueList, useApprovalQueue } from '@/features/approvals/engine';
import { useMaterialItems, usePartyItems } from '@/features/master-data';
import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { rateApproval } from '../approvals';
import { MasterList } from '../components/master-list';

const TABS = ['parties', 'materials', 'rates'] as const;

export function MastersScreen() {
  const [tab, setTab] = useTabParam(TABS, 'parties');
  const canApprove = useCan('MASTERS', 'approve');
  const rates = useApprovalQueue(rateApproval, canApprove);
  const parties = usePartyItems();
  const materials = useMaterialItems();
  const tabs = [
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
          <MasterList host={host} kind="materials" items={materials} noun="materials" onOpen={(i) => router.push({ pathname: '/masters/material/[id]', params: { id: i.id } })} />
        ) : (
          <MasterList host={host} kind="parties" items={parties} noun="parties" onOpen={(i) => router.push({ pathname: '/masters/party/[id]', params: { id: i.id } })} />
        )
      }
    </ModuleScreen>
  );
}
