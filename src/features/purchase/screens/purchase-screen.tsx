/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { QueueList, useApprovalQueue } from '@/features/approvals/engine';
import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { poApproval } from '../approvals';
import { DashboardTab } from '../components/dashboard-tab';
import { LookupTab } from '../components/lookup-tab';

const TABS = ['dashboard', 'lookup', 'pending'] as const;

export function PurchaseScreen() {
  const session = useSession();
  const [tab] = useTabParam(TABS, 'dashboard');
  // Set by the dashboard's tappable groups; any tab change drops it so Lookup opens unfiltered next time.
  const { delivery, kind } = useLocalSearchParams<{ delivery?: string; kind?: string }>();
  const setTab = (k: (typeof TABS)[number]) => router.setParams({ tab: k, delivery: undefined, kind: undefined });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBadge, setFilterBadge] = useState(0);
  const pending = useApprovalQueue(poApproval);
  const canApprove = can(session, 'PURCHASE', 'approve');
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard' },
    { key: 'lookup' as const, label: 'PO Lookup' },
    ...(canApprove ? [{ key: 'pending' as const, label: 'Pending', badge: pending.data?.length }] : []),
  ];
  return (
    <ModuleScreen
      title="Purchase"
      tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}
      actions={
        tab === 'lookup'
          ? [{ icon: 'options-outline', label: 'Filters', badge: filterBadge, onPress: () => setFilterOpen(true) }]
          : []
      }>
      {(host) =>
        tab === 'lookup' ? (
          <LookupTab
            key={`${delivery ?? ''}:${kind ?? ''}`}
            delivery={delivery}
            kind={kind === 'po' || kind === 'jo' ? kind : undefined}
            host={host}
            filterOpen={filterOpen}
            onFilterClose={() => setFilterOpen(false)}
            onFilterCount={setFilterBadge}
          />
        ) : tab === 'pending' && canApprove ? (
          <QueueList config={poApproval} host={host} />
        ) : (
          <DashboardTab host={host} />
        )
      }
    </ModuleScreen>
  );
}
