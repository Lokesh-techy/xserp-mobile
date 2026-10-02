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

export const poDashboardSchema = z.looseObject({
  indent_raised: zNum,
  indent_closed: zNum,
  indent_pending: zNum,
  indent_due_po: zNum,
  indent_due_material: zNum,
  pending: zNum,
  pending_on_track: zNum,
  pending_delayed: zNum,
  part_supplied: zNum,
  part_on_track: zNum,
  part_delayed: zNum,
  performance: zList(z.looseObject({ po_month: zStr, on_time: zNum, delayed: zNum })),
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
export const supplierProfileSchema = z.looseObject({ supplier_prices: zList(priceRow), supplier_history: zList(priceRow) });

export { financeYearsSchema, materialStockSchema, outstandingSchema } from '@/core/erp';
