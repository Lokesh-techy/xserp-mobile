/** @author Lokesh */
import { z } from 'zod';

import { post, postOk } from '@/core/api';
import type { Session } from '@/core/auth';
import { rangeParams, type DateRange } from '@/core/utils';

import { grnListSchema, grnStatusSchema, indentStatusSchema, stockCheckSchema, stockStatementSchema, storeDashboardSchema, type ReceiptRow } from './schemas';

export type Remark = { by: string; date: string; text: string };
export type ReceiptMaterial = { key: string; itemId: string; makeId: string; name: string; drawingNo: string; receivedQty: number; acceptedQty: number; rate: number; unit: string };
export type Receipt = {
  receiptNo: string;
  code: string;
  isGrn: boolean;
  supplierName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  invoiceDate: string | null;
  invoiceValue: number;
  receiptDate: string | null;
  currency: string;
  noteId: string;
  noteIsCredit: boolean;
  noteCode: string;
  noteValue: number;
  materials: ReceiptMaterial[];
  remarks: Remark[];
  auditRemarks: Remark[];
  documents: { uid: string; ext: string; name: string }[];
};
export type Movement = { date: string; docNo: string; issue: number; receipt: number };

const toRemark = (r: { remarks: string; date: string; by: string }): Remark => ({ by: r.by, date: r.date, text: r.remarks });

export const toReceipt = (r: ReceiptRow): Receipt => ({
  receiptNo: r.receipt_no,
  code: r.code,
  isGrn: r.is_grn,
  supplierName: r.supplier_name,
  projectId: r.project_id,
  projectCode: r.project_code,
  projectName: r.project_name,
  invoiceDate: r.invoice_date,
  invoiceValue: r.invoice_value,
  receiptDate: r.receipt_date,
  currency: r.currency_symbol || '₹',
  noteId: r.note_id ?? '',
  noteIsCredit: r.note_is_credit,
  noteCode: r.note_code,
  noteValue: r.note_value,
  materials: r.materials.map((m) => ({ key: `${m.item_id}:${m.make_id}`, itemId: m.item_id, makeId: m.make_id, name: m.name, drawingNo: m.drawing_no, receivedQty: m.received_qty || m.quantity, acceptedQty: m.accepted_qty, rate: m.rate || m.price, unit: m.unit })),
  remarks: r.remarks.map(toRemark),
  auditRemarks: r.audit_remarks.map(toRemark),
  documents: r.documents,
});

export const toMovements = (s: z.infer<typeof stockCheckSchema>): Movement[] =>
  (s.material_stock.length ? s.material_stock : s.stock_details).map((m) => ({ date: m.date, docNo: m.doc_no, issue: m.issue_qty, receipt: m.receipt_qty }));

export const fetchStoreDashboard = (r: DateRange) => post('stores/json/dashboard_data/', rangeParams(r), { schema: storeDashboardSchema });
export const fetchStockStatement = (r: DateRange) => post('stores/json/list_stock_statement/', rangeParams(r), { schema: stockStatementSchema });
export const fetchIndentStatus = (r: DateRange) => post('stores/json/indentStatus/', rangeParams(r, ['from_date', 'to_date']), { schema: indentStatusSchema });
export const fetchGrnStatus = (r: DateRange) => post('stores/json/grnStatus/', rangeParams(r, ['from_date', 'to_date']), { schema: grnStatusSchema });
export const fetchDraftGrns = async () => (await post('stores/json/grn_draft/', {}, { schema: grnListSchema })).grn_list.map(toReceipt);

export async function stockCheck(itemId: string, makeId: string, opts: { range: DateRange; faulty: boolean; excludeDrafts: boolean }) {
  const res = await post(
    'stores/json/stockCheck/',
    { item_id: itemId, make_id: makeId, is_faulty: opts.faulty ? 1 : 0, exclude_drafts: opts.excludeDrafts ? 1 : 0, ...rangeParams(opts.range, ['from_date', 'to_date']) },
    { schema: stockCheckSchema },
  );
  return { opening: res.opening_stock, closing: res.closing_stock, movements: toMovements(res) };
}

export async function approveGrn(r: Receipt, remarks: string, session: Session) {
  await postOk('stores/json/grn/approve/', {
    receipt_no: r.receiptNo,
    fy_start_day: session.fyStartDay ?? '',
    icd: session.icd.enabled,
    icd_auto_gen_voucher: session.icd.autoGenVoucher,
    icd_ignore_credit_note: session.icd.ignoreCreditNote,
    remarks,
  });
}

export async function rejectGrn(r: Receipt, remarks: string) {
  await postOk('stores/json/grn/reject/', { receipt_no: r.receiptNo, remarks, is_flag: true });
}
