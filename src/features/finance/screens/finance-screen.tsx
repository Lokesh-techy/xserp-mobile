/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';

import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { AgeingTab } from '../components/ageing-tab';
import { DashboardTab } from '../components/dashboard-tab';
import { LedgersTab } from '../components/ledgers-tab';
import { isFinanceSide } from '../dashboard-model';

const TABS = ['dashboard', 'ageing', 'ledgers'] as const;

export function FinanceScreen() {
  const [tab] = useTabParam(TABS, 'dashboard');
  // Set by the dashboard's Receivables/Payables tiles; any tab change drops it so Ageing opens as left next time.
  const { side } = useLocalSearchParams<{ side?: string }>();
  const setTab = (k: (typeof TABS)[number]) => router.setParams({ tab: k, side: undefined });
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard' },
    { key: 'ageing' as const, label: 'Ageing' },
    { key: 'ledgers' as const, label: 'Ledgers' },
  ];
  return (
    <ModuleScreen title="Finance" tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}>
      {(host) =>
        tab === 'ageing' ? (
          <AgeingTab key={side ?? ''} host={host} side={isFinanceSide(side) ? side : undefined} />
        ) : tab === 'ledgers' ? (
          <LedgersTab host={host} />
        ) : (
          <DashboardTab host={host} />
        )
      }
    </ModuleScreen>
  );
}
