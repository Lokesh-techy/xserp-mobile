/** @author Lokesh */
import { View } from 'react-native';

import { currentEnterpriseId, ERP } from '@/core/api';
import { can } from '@/core/permissions';
import { formatDate, formatQty, parseServerDate } from '@/core/utils';
import { defineApproval, type LineItem } from '@/features/approvals/engine';
import { DocumentButton } from '@/ui';

import {
  approveInvoice,
  approveOA,
  checkCanRejectOA,
  fetchDraftInvoices,
  fetchDraftOAs,
  fetchInvoiceMaterials,
  fetchOaMaterials,
  rejectInvoice,
  rejectOA,
  type Invoice,
  type OA,
  type SalesMaterial,
} from './api';
import { parseAttachments } from './attachments';
import { PartyOutstanding } from './components/party-outstanding';
import { salesKeys } from './keys';
import { invoiceStatus, oaStatus } from './status';

const toLines = (materials: SalesMaterial[] | undefined, currency: string): LineItem[] =>
  (materials ?? []).map((m) => ({
    key: m.key,
    title: m.name,
    subtitle: [m.drawingNo, m.makeName && m.makeName !== '-NA-' ? m.makeName : null].filter(Boolean).join(' · '),
    qty: formatQty(m.quantity, m.unit),
    amount: m.quantity * m.rate * (1 - m.discount / 100),
    currency,
  }));

/** One button per uploaded file, named as it was uploaded. */
function OaAttachments({ item }: { item: OA }) {
  const files = parseAttachments(item.documentUri, currentEnterpriseId());
  return (
    <View style={{ gap: 10 }}>
      {files.map((f, i) => (
        <DocumentButton
          key={`${f.key}:${i}`}
          label={files.length === 1 ? 'Open attachment' : f.name}
          request={{ path: ERP.commons.document, params: { document_uri: f.key }, filename: f.name, raw: true }}
        />
      ))}
    </View>
  );
}

/** Past its due date and not settled — worth flagging on the list. */
const isOverdue = (dueOn: string, paymentStatus: string) => {
  const due = parseServerDate(dueOn);
  return !!due && due < new Date() && !/^paid$|fully|settled|received/i.test(paymentStatus.trim());
};

export const invoiceApproval = defineApproval<Invoice, SalesMaterial[]>({
  type: 'invoice',
  title: 'Invoices',
  noun: 'Invoice',
  short: 'Invoice',
  permission: 'SALES',
  tint: 'sales',
  queueKey: salesKeys.draftInvoices(),
  queue: fetchDraftInvoices,
  id: (i) => i.id,
  search: (i) => [i.code, i.partyName, i.projectName, i.gstin],
  summary: (i) => ({
    code: i.code || `Draft #${i.id}`,
    party: i.partyName,
    amount: i.value,
    currency: i.currency,
    date: i.date,
    status: invoiceStatus(i.status),
    meta: [
      ...(i.projectName ? [{ icon: 'briefcase-outline' as const, text: i.projectName }] : []),
      ...(i.dueOn
        ? [
            {
              icon: 'time-outline' as const,
              text: `Due ${formatDate(i.dueOn, 'd MMM')}`,
              tone: isOverdue(i.dueOn, i.paymentStatus) ? ('danger' as const) : undefined,
            },
          ]
        : []),
      ...(i.paymentStatus ? [{ icon: 'wallet-outline' as const, text: i.paymentStatus }] : []),
      ...(i.type ? [{ icon: 'pricetag-outline' as const, text: i.type }] : []),
      ...(i.poNo ? [{ icon: 'document-outline' as const, text: `PO ${i.poNo}` }] : []),
    ],
  }),
  detailKey: (i) => salesKeys.invoiceMaterials(i.id),
  detail: fetchInvoiceMaterials,
  lines: (i, m) => toLines(m, i.currency),
  sections: [
    {
      key: 'outstanding',
      title: 'Customer outstanding',
      Component: ({ item }) => <PartyOutstanding partyId={item.partyId} />,
      visible: (_i, { session }) => can(session, 'ACCOUNTS', 'view'),
    },
  ],
  document: (i) => ({
    path: ERP.sales.invoiceDoc,
    params: { invoice_id: i.id, inv_type: i.type },
    filename: `${i.code || `INV-${i.id}`}.pdf`,
  }),
  actions: [
    {
      id: 'approve',
      label: 'Approve',
      icon: 'checkmark-circle-outline',
      tone: 'success',
      remarks: 'optional',
      visible: (i) => i.status === 0,
      run: (i, r) => approveInvoice(i, r),
      done: 'approved',
    },
    {
      id: 'reject',
      label: 'Reject',
      icon: 'close-circle-outline',
      tone: 'danger',
      remarks: 'required',
      visible: (i) => i.status === 0,
      run: (i, r) => rejectInvoice(i, r),
      done: 'rejected',
    },
  ],
  invalidate: [salesKeys.dashboard(), [...salesKeys.all, 'search']],
});

export const oaApproval = defineApproval<OA, SalesMaterial[]>({
  type: 'oa',
  title: 'Order acknowledgements',
  noun: 'OA',
  short: 'OA',
  permission: 'SALES',
  tint: 'sales',
  queueKey: salesKeys.draftOAs(),
  queue: fetchDraftOAs,
  id: (o) => o.id,
  search: (o) => [o.code, o.partyName, o.projectName],
  summary: (o) => ({
    code: o.code || `Draft #${o.id}`,
    party: o.partyName,
    amount: o.value,
    currency: o.currency,
    date: o.approvedOn ?? o.preparedOn,
    status: oaStatus(o.status),
    meta: [
      ...(o.projectName ? [{ icon: 'briefcase-outline' as const, text: o.projectName }] : []),
      ...(o.deliveryDue
        ? [{ icon: 'time-outline' as const, text: `Delivery ${formatDate(o.deliveryDue, 'd MMM')}` }]
        : []),
    ],
  }),
  detailKey: (o) => salesKeys.oaMaterials(o.id),
  detail: fetchOaMaterials,
  lines: (o, m) => toLines(m, o.currency),
  sections: [
    {
      key: 'attachment',
      title: 'Customer PO',
      visible: (o) => o.attached && parseAttachments(o.documentUri, currentEnterpriseId()).length > 0,
      Component: OaAttachments,
    },
    {
      key: 'outstanding',
      title: 'Customer outstanding',
      Component: ({ item }) => <PartyOutstanding partyId={item.partyId} />,
      visible: (_o, { session }) => can(session, 'ACCOUNTS', 'view'),
    },
  ],
  document: (o) => ({ path: ERP.sales.oaDoc, params: { oa_id: o.id }, filename: `${o.code || `OA-${o.id}`}.pdf` }),
  actions: [
    {
      id: 'approve',
      label: 'Approve',
      icon: 'checkmark-circle-outline',
      tone: 'success',
      remarks: 'optional',
      visible: (o) => o.status === 0,
      run: (o, r) => approveOA(o, r),
      done: 'approved',
    },
    {
      id: 'update',
      label: 'Update',
      icon: 'refresh-outline',
      tone: 'primary',
      remarks: 'optional',
      visible: (o) => o.status === 1,
      run: (o, r) => approveOA(o, r),
      done: 'updated',
    },
    {
      id: 'reject',
      label: 'Reject',
      icon: 'close-circle-outline',
      tone: 'danger',
      remarks: 'required',
      visible: (o) => o.status === 0 || o.status === 1,
      precheck: checkCanRejectOA,
      run: (o, r) => rejectOA(o, r),
      done: 'rejected',
    },
  ],
  invalidate: [salesKeys.dashboard(), [...salesKeys.all, 'search']],
});
