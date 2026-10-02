/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';

const monthly = z.looseObject({ month: zStr, value: zNum, delayed: zNum, on_time: zNum, advance: zNum, key_to_sort: zStr });

export const salesDashboardSchema = z.looseObject({
  oa_pending: zNum,
  oa_on_track: zNum,
  oa_overdue: zNum,
  pending_on_track: zNum,
  pending_delayed: zNum,
  sales_performance: zList(monthly),
  delivery_performance: zList(monthly),
  payment_collection: zList(monthly),
});

export const salesDetailSchema = z.looseObject({ oa_on_track: zNum, oa_delayed: zNum, collection_on_time: zNum, collection_delayed: zNum });

export const invoiceSchema = z.looseObject({
  id: zId,
  invoice_no: zStr,
  invoice_code: zStr,
  type: zStr,
  status: zNum,
  date: zStrOrNull,
  issued_on: zStrOrNull,
  approved_on: zStrOrNull,
  po_no: zStr,
  due_on: zStrOrNull,
  due_days: zNum,
  payment_status: zStr,
  party_id: zId,
  party_name: zStr,
  gstin: zStr,
  project_code: zStr,
  project_name: zStr,
  value: zNum,
  grand_total: zNum,
  currency_symbol: zStr,
});
export type InvoiceRow = z.infer<typeof invoiceSchema>;
export const invoiceListSchema = z.looseObject({ invoice_list: zList(invoiceSchema) });

const party = z.looseObject({ id: zId, code: zStr, name: zStr });
export const oaSchema = z.looseObject({
  id: zId,
  oa_no: zStr,
  oa_code: zStr,
  status: zNum,
  prepared_on: zStrOrNull,
  approved_on: zStrOrNull,
  po_date: zStrOrNull,
  delivery_due_date: zStrOrNull,
  project_code: zStr,
  project_name: zStr,
  grand_total: zNum,
  currency_symbol: zStr,
  quantity: zNum,
  supplier: party.nullish(),
  document: zStr,
  is_attached: zBool,
});
export type OaRow = z.infer<typeof oaSchema>;
export const oaListSchema = z.looseObject({ oa_list: zList(oaSchema) });

export const salesMaterialsSchema = z.looseObject({
  materials: zList(
    z.looseObject({ item_id: zId, make_id: zId, drawing_no: zStr, name: zStr, make_name: zStr, quantity: zNum, rate: zNum, price: zNum, discount: zNum, unit: zStr }),
  ),
});
