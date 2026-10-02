/** @author Lokesh */
import { View } from 'react-native';

import { formatQty } from '@/core/utils';
import { defineApproval } from '@/features/approvals/engine';
import { RemarksHistory, type Receipt, type ReceiptMaterial } from '@/features/stores';
import { DocumentButton } from '@/ui';

import { auditDocument, fetchGrnMaterials, fetchPendingGrnNotes, returnGrn, verifyNote } from './api';
import { recordAudit } from './session-store';

export const auditKeys = { all: ['audit'] as const, pending: () => ['audit', 'pending'] as const, materials: (id: string) => ['audit', 'materials', id] as const };

function Documents({ item }: { item: Receipt }) {
  return (
    <View style={{ gap: 10 }}>
      <DocumentButton label="GRN" request={auditDocument(item, 'receipt')} />
      <DocumentButton label="Supplier invoice" request={auditDocument(item, 'invoice')} />
      {!!item.noteCode && <DocumentButton label={`${item.noteIsCredit ? 'Credit' : 'Debit'} note`} request={auditDocument(item, 'note')} />}
    </View>
  );
}

export const icdApproval = defineApproval<Receipt, ReceiptMaterial[]>({
  type: 'icd',
  title: 'GRN audit',
  noun: 'GRN',
  short: 'Audit',
  permission: 'ICD',
  tint: 'audit',
  queueKey: auditKeys.pending(),
  queue: fetchPendingGrnNotes,
  id: (r) => r.receiptNo,
  search: (r) => [r.code, r.supplierName, r.projectName, r.noteCode],
  summary: (r) => ({
    code: r.code || `Receipt #${r.receiptNo}`,
    party: r.supplierName,
    amount: r.noteCode ? r.noteValue : r.invoiceValue,
    currency: r.currency,
    date: r.receiptDate,
    status: { label: 'Checked', tone: 'info' },
    meta: r.noteCode ? [{ icon: 'document-attach-outline', text: `${r.noteIsCredit ? 'Credit' : 'Debit'} note ${r.noteCode}` }] : r.projectName ? [{ icon: 'briefcase-outline', text: r.projectName }] : [],
  }),
  detailKey: (r) => auditKeys.materials(r.receiptNo),
  detail: fetchGrnMaterials,
  lines: (r, m) => (m ?? r.materials).map((x) => ({ key: x.key, title: x.name, subtitle: x.drawingNo, qty: `${formatQty(x.acceptedQty, x.unit)} accepted`, amount: x.acceptedQty * x.rate, currency: r.currency })),
  sections: [
    { key: 'docs', title: 'Documents', Component: Documents },
    { key: 'remarks', title: 'Audit remarks', Component: ({ item }) => <RemarksHistory remarks={item.auditRemarks} /> },
  ],
  actions: [
    {
      id: 'verify',
      label: 'Verify',
      icon: 'shield-checkmark-outline',
      tone: 'success',
      remarks: 'optional',
      visible: () => true,
      run: async (r, remarks) => {
        await verifyNote(r, remarks);
        recordAudit('verified', r);
      },
      done: 'verified',
    },
    {
      id: 'return',
      label: 'Return',
      icon: 'arrow-undo-outline',
      tone: 'danger',
      remarks: 'required',
      visible: () => true,
      run: async (r, remarks) => {
        await returnGrn(r, remarks);
        recordAudit('returned', r);
      },
      done: 'returned',
    },
  ],
});
