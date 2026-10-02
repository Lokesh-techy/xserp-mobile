/** @author Lokesh */
import { useState } from 'react';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { QueueList, useApprovalQueue } from '@/features/approvals/engine';
import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { invoiceApproval, oaApproval } from '../approvals';
import { DashboardTab } from '../components/dashboard-tab';
import { LookupTab } from '../components/lookup-tab';

const TABS = ['dashboard', 'lookup', 'pendingInvoices', 'pendingOa'] as const;

export function SalesScreen() {
  const session = useSession();
  const [tab, setTab] = useTabParam(TABS, 'dashboard');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBadge, setFilterBadge] = useState(0);
  const canApprove = can(session, 'SALES', 'approve');
  const invoices = useApprovalQueue(invoiceApproval, canApprove);
  const oas = useApprovalQueue(oaApproval, canApprove);
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard' },
    { key: 'lookup' as const, label: 'Lookup' },
    ...(canApprove
      ? [
          { key: 'pendingInvoices' as const, label: 'Pending invoices', badge: invoices.data?.length },
          { key: 'pendingOa' as const, label: 'Pending OA', badge: oas.data?.length },
        ]
      : []),
  ];
  return (
    <ModuleScreen
      title="Sales"
      tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}
      actions={tab === 'lookup' ? [{ icon: 'options-outline', label: 'Filters', badge: filterBadge, onPress: () => setFilterOpen(true) }] : []}>
      {(host) =>
        tab === 'lookup' ? (
          <LookupTab host={host} filterOpen={filterOpen} onFilterClose={() => setFilterOpen(false)} onFilterCount={setFilterBadge} />
        ) : tab === 'pendingInvoices' && canApprove ? (
          <QueueList config={invoiceApproval} host={host} />
        ) : tab === 'pendingOa' && canApprove ? (
          <QueueList config={oaApproval} host={host} />
        ) : (
          <DashboardTab host={host} />
        )
      }
    </ModuleScreen>
  );
}
