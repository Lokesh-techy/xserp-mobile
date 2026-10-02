/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';

const statement = z.looseObject({ opening_stock: zNum, closing_stock: zNum, stock_issues: zNum, stock_receipt: zNum });
export const storeDashboardSchema = z.looseObject({
  stock_statement: statement.nullish(),
  stock_mix: zList(z.looseObject({ category: zStr, value: zNum })),
  monthly_closing_stock: zList(z.looseObject({ month: zStr, closing_stock: zNum })),
});
export const stockStatementSchema = statement;

export const indentStatusSchema = z.looseObject({ indent_raised: zNum, indent_closed: zNum, indent_pending: zNum, indent_due_po: zNum, indent_due_material: zNum });
export const grnStatusSchema = z.looseObject({ grn_raised: zNum, grn_inprocess: zNum, grn_accounted: zNum });

const remark = z.looseObject({ remarks: zStr, date: zStr, by: zStr });
const doc = z.looseObject({ uid: zStr, ext: zStr, name: zStr });

export const receiptSchema = z.looseObject({
  receipt_no: zId,
  is_grn: zBool,
  code: zStr,
  supplier_name: zStr,
  project_id: zId,
  project_code: zStr,
  project_name: zStr,
  invoice_date: zStrOrNull,
  invoice_value: zNum,
  receipt_date: zStrOrNull,
  currency_symbol: zStr,
  note_id: zId.optional(),
  note_is_credit: zBool,
  note_code: z.preprocess((v) => (v === '-' ? '' : v), zStr),
  note_value: zNum,
  materials: zList(z.looseObject({ item_id: zId, make_id: zId, name: zStr, drawing_no: zStr, received_qty: zNum, accepted_qty: zNum, quantity: zNum, rate: zNum, price: zNum, unit: zStr })),
  remarks: zList(remark),
  audit_remarks: zList(remark),
  // XSManager typed this as one Document; the server may also send a list, a JSON string or null.
  documents: z.preprocess((v) => {
    let d: unknown = v;
    if (typeof d === 'string') {
      try {
        d = JSON.parse(d);
      } catch {
        d = null;
      }
    }
    return Array.isArray(d) ? d : d && typeof d === 'object' ? [d] : [];
  }, z.array(doc)),
});
export type ReceiptRow = z.infer<typeof receiptSchema>;
export const grnListSchema = z.looseObject({ grn_list: zList(receiptSchema) });

const movement = z.looseObject({ date: zStr, doc_no: zStr, issue_qty: zNum, receipt_qty: zNum });
export const stockCheckSchema = z.looseObject({ opening_stock: zNum, closing_stock: zNum, stock_details: zList(movement), material_stock: zList(movement) });
