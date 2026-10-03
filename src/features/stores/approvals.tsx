/** @author Lokesh */
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { formatDate, formatQty } from '@/core/utils';
import { defineApproval } from '@/features/approvals/engine';
import { Card, Text } from '@/ui';

import { approveGrn, fetchDraftGrns, rejectGrn, type Receipt, type Remark } from './api';
import { storesKeys } from './keys';

export function RemarksHistory({ remarks }: { remarks: Remark[] }) {
  const t = useTheme();
  if (remarks.length === 0) {
    return (
      <Text variant="body" color={t.colors.textMuted}>
        No remarks yet
      </Text>
    );
  }
  return (
    <Card style={{ gap: 10 }}>
      {remarks.map((r, i) => (
        <View key={i} style={{ gap: 2 }}>
          <Text variant="label">{r.text}</Text>
          <Text variant="caption" color={t.colors.textMuted}>
            {[r.by, r.date].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export const grnApproval = defineApproval<Receipt>({
  type: 'grn',
  title: 'Goods receipts',
  noun: 'GRN',
  short: 'GRN',
  permission: 'STORES',
  tint: 'stores',
  queueKey: storesKeys.drafts(),
  queue: fetchDraftGrns,
  id: (r) => r.receiptNo,
  search: (r) => [r.code, r.receiptNo, r.supplierName, r.projectName],
  summary: (r) => ({
    code: r.code || `Receipt #${r.receiptNo}`,
    party: r.supplierName,
    amount: r.invoiceValue,
    currency: r.currency,
    date: r.receiptDate,
    status: { label: 'Awaiting approval', tone: 'warning' },
    meta: [
      ...(r.projectName ? [{ icon: 'briefcase-outline' as const, text: r.projectName }] : []),
      ...(r.materials.length ? [{ icon: 'cube-outline' as const, text: `${r.materials.length} ${r.materials.length === 1 ? 'item' : 'items'}` }] : []),
      ...(r.invoiceDate ? [{ icon: 'receipt-outline' as const, text: `Invoice ${formatDate(r.invoiceDate, 'd MMM')}` }] : []),
    ],
  }),
  lines: (r) => r.materials.map((m) => ({ key: m.key, title: m.name, subtitle: m.drawingNo, qty: `${formatQty(m.acceptedQty, m.unit)} of ${formatQty(m.receivedQty)}`, amount: m.acceptedQty * m.rate, currency: r.currency })),
  sections: [{ key: 'remarks', title: 'Remarks history', Component: ({ item }) => <RemarksHistory remarks={item.remarks} /> }],
  actions: [
    { id: 'approve', label: 'Approve', icon: 'checkmark-circle-outline', tone: 'success', remarks: 'optional', visible: () => true, run: (r, remarks, { session }) => approveGrn(r, remarks, session), done: 'approved' },
    { id: 'reject', label: 'Reject', icon: 'close-circle-outline', tone: 'danger', remarks: 'required', visible: () => true, run: (r, remarks) => rejectGrn(r, remarks), done: 'rejected' },
  ],
  invalidate: [[...storesKeys.all, 'grnStatus']],
});
