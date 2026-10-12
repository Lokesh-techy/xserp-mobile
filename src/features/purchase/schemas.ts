/** @author Lokesh */
import { z } from 'zod';

import { zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';

const party = z.looseObject({ id: zId, code: zStr, name: zStr });

export const purchaseOrderSchema = z.looseObject({
  po_id: zId,
  po_code: zStr,
  drafted_on: zStrOrNull,
  approved_on: zStrOrNull,
  supplier_name: zStr,
  supplier: party.nullish(),
  project_code: zStr,
  project_name: zStr,
  po_value: zNum,
  currency_name: zStr,
  currency_symbol: zStr,
  quantity: zNum,
  unit: zStr,
  material_status: zStr,
  delivery_status: zStr,
  due_days: zNum,
  status: zNum,
  po_type: zNum,
  indent: z.looseObject({ code: zStr }).nullish(),
});
export type PurchaseOrderRow = z.infer<typeof purchaseOrderSchema>;

export const poListSchema = z.looseObject({ po_list: zList(purchaseOrderSchema) });

export const poMaterialSchema = z.looseObject({
  item_id: zId,
  make_id: zId,
  drawing_no: zStr,
  name: zStr,
  make_name: zStr,
  quantity: zNum,
  price: zNum,
  discount: zNum,
  unit: zStr,
  store_price: zNum,
});
export const poDetailSchema = z.looseObject({ materials: zList(poMaterialSchema), supplier: party.nullish() });

// Open POs by delivery state, with values and monthly delivery performance: for all orders, and per order kind.
const orderStatus = {
  pending: zNum,
  pending_on_track: zNum,
  pending_delayed: zNum,
  part_supplied: zNum,
  part_on_track: zNum,
  part_delayed: zNum,
  // Open PO values (₹); sent by servers with the one-query getPOStatus, absent on older ones.
  pending_value: zNum.optional(),
  part_value: zNum.optional(),
  delayed_value: zNum.optional(),
  performance: zList(z.looseObject({ po_month: zStr, on_time: zNum, delayed: zNum })),
};
const orderStatusSchema = z.looseObject(orderStatus);

export const poDashboardSchema = z.looseObject({
  indent_raised: zNum,
  indent_closed: zNum,
  indent_pending: zNum,
  indent_due_po: zNum,
  indent_due_material: zNum,
  ...orderStatus,
  /** Purchase orders and job orders apart; absent on servers that only send the combined figures. */
  by_type: z.looseObject({ po: orderStatusSchema, jo: orderStatusSchema }).optional(),
});

const priceRow = z.looseObject({
  price: zNum,
  status: zNum,
  effect_since: zStrOrNull,
  effect_till: zStrOrNull,
  name: zStr.optional(),
  supplier: party.nullish(),
  make: zStr.optional(),
  label: zStr.optional(),
  currency_name: zStr.optional(),
});
export const supplierProfileSchema = z.looseObject({
  supplier_prices: zList(priceRow),
  supplier_history: zList(priceRow),
});

export { financeYearsSchema, materialStockSchema, outstandingSchema } from '@/core/erp';
