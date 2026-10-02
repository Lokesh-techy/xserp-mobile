/** @author Lokesh */
import { useCan } from '@/core/permissions';
import { useApprovalQueue } from '@/features/approvals/engine';
import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { grnApproval } from '../approvals';
import { GrnTab } from '../components/grn-tab';
import { IndentTab } from '../components/indent-tab';
import { StockCheckTab } from '../components/stock-check-tab';
import { StockTab } from '../components/stock-tab';

const TABS = ['stock', 'indent', 'grn', 'check'] as const;

export function StoresScreen() {
  const [tab, setTab] = useTabParam(TABS, 'stock');
  const canApprove = useCan('STORES', 'approve');
  const pending = useApprovalQueue(grnApproval, canApprove);
  const tabs = [
    { key: 'stock' as const, label: 'Stock' },
    { key: 'indent' as const, label: 'Indent' },
    { key: 'grn' as const, label: 'GRN', badge: canApprove ? pending.data?.length : undefined },
    { key: 'check' as const, label: 'Stock check' },
  ];
  return (
    <ModuleScreen title="Stores" tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}>
      {(host) => (tab === 'indent' ? <IndentTab host={host} /> : tab === 'grn' ? <GrnTab host={host} /> : tab === 'check' ? <StockCheckTab host={host} /> : <StockTab host={host} />)}
    </ModuleScreen>
  );
}
