/** @author Lokesh */
import { useCan } from '@/core/permissions';
import { useApprovalQueue } from '@/features/approvals/engine';
import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { grnApproval } from '../approvals';
import { DashboardTab } from '../components/dashboard-tab';
import { GrnTab } from '../components/grn-tab';
import { StockCheckTab } from '../components/stock-check-tab';

// Stock and indent figures live on the dashboard; old links to ?tab=stock / ?tab=indent fall back to it.
const TABS = ['dashboard', 'grn', 'check'] as const;

export function StoresScreen() {
  const [tab, setTab] = useTabParam(TABS, 'dashboard');
  const canApprove = useCan('STORES', 'approve');
  const pending = useApprovalQueue(grnApproval, canApprove);
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard' },
    { key: 'grn' as const, label: 'GRN', badge: canApprove ? pending.data?.length : undefined },
    { key: 'check' as const, label: 'Stock check' },
  ];
  return (
    <ModuleScreen title="Stores" tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}>
      {(host) => (tab === 'grn' ? <GrnTab host={host} /> : tab === 'check' ? <StockCheckTab host={host} /> : <DashboardTab host={host} />)}
    </ModuleScreen>
  );
}
