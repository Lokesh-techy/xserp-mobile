/** @author Lokesh */
import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { AgeingTab } from '../components/ageing-tab';
import { DashboardTab } from '../components/dashboard-tab';
import { LedgersTab } from '../components/ledgers-tab';

const TABS = ['dashboard', 'ageing', 'ledgers'] as const;

export function FinanceScreen() {
  const [tab, setTab] = useTabParam(TABS, 'dashboard');
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard' },
    { key: 'ageing' as const, label: 'Ageing' },
    { key: 'ledgers' as const, label: 'Ledgers' },
  ];
  return (
    <ModuleScreen title="Finance" tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}>
      {(host) => (tab === 'ageing' ? <AgeingTab host={host} /> : tab === 'ledgers' ? <LedgersTab host={host} /> : <DashboardTab host={host} />)}
    </ModuleScreen>
  );
}
