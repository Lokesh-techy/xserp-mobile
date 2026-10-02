/** @author Lokesh */
import { can } from '@/core/permissions';
import { defineApproval } from '@/features/approvals/engine';
import { formatQty } from '@/core/utils';

import { approvePO, checkCanRejectPO, fetchDraftPOs, fetchPoMaterials, rejectPO, reviewPO, type PoMaterial, type PurchaseOrder } from './api';
import { MaterialSheet } from './components/material-sheet';
import { OutstandingSection } from './components/outstanding-section';
import { purchaseKeys } from './keys';
import { poStatus } from './status';

export const poApproval = defineApproval<PurchaseOrder, PoMaterial[]>({
  type: 'po',
  title: 'Purchase orders',
  noun: 'PO',
  permission: 'PURCHASE',
  tint: 'purchase',
  queueKey: purchaseKeys.drafts(),
  queue: fetchDraftPOs,
  id: (po) => po.id,
  search: (po) => [po.code, po.supplierName, po.projectName, po.projectCode],
  summary: (po) => ({
    code: po.code || `Draft #${po.id}`,
    party: po.supplierName,
    amount: po.value,
    currency: po.currency,
    date: po.approvedOn ?? po.draftedOn,
    status: poStatus(po.status),
    meta: [
      ...(po.projectName ? [{ icon: 'briefcase-outline' as const, text: po.projectName }] : []),
      ...(po.poType === 1 ? [{ icon: 'construct-outline' as const, text: 'Job order' }] : []),
      ...(po.indentCode ? [{ icon: 'document-outline' as const, text: `Indent ${po.indentCode}` }] : []),
    ],
  }),
  detailKey: (po) => purchaseKeys.materials(po.id),
  detail: fetchPoMaterials,
  lines: (_po, materials) =>
    (materials ?? []).map((m) => ({
      key: `${m.itemId}:${m.makeId}`,
      title: m.name,
      subtitle: [m.drawingNo, m.makeName && m.makeName !== '-NA-' ? m.makeName : null].filter(Boolean).join(' · '),
      qty: formatQty(m.quantity, m.unit),
      amount: m.quantity * m.price * (1 - m.discount / 100),
    })),
  lineSheet: MaterialSheet,
  sections: [{ key: 'outstanding', title: 'Supplier outstanding', Component: OutstandingSection, visible: (_po, { session }) => can(session, 'ACCOUNTS', 'view') }],
  document: (po) => ({ path: 'purchase/json/po_doc/', params: { po_id: po.id, po_type: po.poType }, filename: `${po.code || `PO-${po.id}`}.pdf` }),
  actions: [
    { id: 'approve', label: 'Approve', icon: 'checkmark-circle-outline', tone: 'success', remarks: 'optional', visible: (po) => po.status === 0 || po.status === 1, run: (po, r) => approvePO(po, r), done: 'approved' },
    { id: 'review', label: 'Review', icon: 'eye-outline', tone: 'ghost', remarks: 'optional', visible: (po) => po.status === 0, run: (po, r) => reviewPO(po, r), done: 'marked reviewed' },
    { id: 'update', label: 'Update', icon: 'refresh-outline', tone: 'primary', remarks: 'optional', visible: (po) => po.status === 2, run: (po, r) => approvePO(po, r), done: 'updated' },
    {
      id: 'reject',
      label: 'Reject',
      icon: 'close-circle-outline',
      tone: 'danger',
      remarks: 'required',
      visible: (po) => po.status >= 0 && po.status !== 3,
      precheck: checkCanRejectPO,
      run: (po, r) => rejectPO(po, r),
      done: 'rejected',
    },
  ],
  invalidate: [purchaseKeys.dashboard(), ['purchase', 'search']],
});
