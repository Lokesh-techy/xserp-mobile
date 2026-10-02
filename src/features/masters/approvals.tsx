/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { formatDate } from '@/core/utils';
import { defineApproval } from '@/features/approvals/engine';
import { LineChartCard, ListSkeleton } from '@/ui';

import { approveRate, fetchMaterialDetail, fetchPendingRates, rejectRate, type RateRequest } from './api';
import { mastersKeys } from './keys';

function PriceHistory({ item }: { item: RateRequest }) {
  const q = useQuery({ queryKey: mastersKeys.material(item.itemId, item.makeId), queryFn: () => fetchMaterialDetail(item.itemId, item.makeId) });
  if (q.isPending) return <ListSkeleton rows={1} />;
  const points = (q.data?.supplier_history ?? [])
    .filter((h) => !h.supplier || h.supplier.id === item.supplierId)
    .map((h) => ({ label: formatDate(h.effect_since, 'MMM yy'), value: h.price }));
  return <LineChartCard title={`${item.supplierName} price history`} data={[...points, { label: 'New', value: item.price }]} />;
}

export const rateApproval = defineApproval<RateRequest>({
  type: 'rate',
  title: 'Rate approvals',
  noun: 'Rate',
  permission: 'MASTERS',
  tint: 'masters',
  queueKey: mastersKeys.rates(),
  queue: fetchPendingRates,
  id: (r) => r.id,
  search: (r) => [r.materialName, r.drawingNo, r.supplierName],
  summary: (r) => ({
    code: r.materialName || r.drawingNo,
    party: r.supplierName,
    amount: r.price,
    currency: r.currency,
    date: r.effectSince,
    status: { label: 'Pending', tone: 'warning' },
    meta: [{ icon: 'calendar-outline', text: r.effectTill ? `Valid till ${formatDate(r.effectTill)}` : 'Open-ended' }, ...(r.make && r.make !== '-NA-' ? [{ icon: 'pricetag-outline' as const, text: r.make }] : [])],
  }),
  sections: [{ key: 'history', title: 'Price history', Component: PriceHistory }],
  actions: [
    { id: 'approve', label: 'Approve', icon: 'checkmark-circle-outline', tone: 'success', remarks: 'optional', visible: () => true, run: (r, remarks) => approveRate(r, remarks), done: 'approved' },
    { id: 'reject', label: 'Reject', icon: 'close-circle-outline', tone: 'danger', remarks: 'required', visible: () => true, run: (r, remarks) => rejectRate(r, remarks), done: 'rejected' },
  ],
});
