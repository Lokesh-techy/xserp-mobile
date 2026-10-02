/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';

/** Some detail endpoints wrap the record (`{party: {...}}`), others return it flat. */
const unwrap = (key: string) => (v: unknown) => {
  if (!v || typeof v !== 'object') return v;
  const inner = (v as Record<string, unknown>)[key];
  return inner && typeof inner === 'object' && !Array.isArray(inner) ? inner : v;
};

export const partyDetailSchema = z.preprocess(
  unwrap('party'),
  z.looseObject({
    id: zId,
    code: zStr,
    name: zStr,
    contact: zStr,
    address_1: zStr,
    address_2: zStr,
    city: zStr,
    state: zStr,
    country: zStr,
    phone: zStr,
    email: zStr,
    gst_no: zStr,
    pan_no: zStr,
    cin_no: zStr,
    tan_no: zStr,
    is_supplier: zBool,
    is_customer: zBool,
    party_details: z.looseObject({ payment_term: zStr, trans_mode: zStr, delivery_address: zStr }).nullish(),
  }),
);
export type PartyDetail = z.infer<typeof partyDetailSchema>;

const priceRow = z.looseObject({ price: zNum, effect_since: zStrOrNull, effect_till: zStrOrNull.optional(), supplier: z.looseObject({ id: zId, name: zStr }).nullish(), name: zStr.optional() });

export const materialDetailSchema = z.preprocess(
  unwrap('material'),
  z.looseObject({
    unit: zStr,
    price: zNum,
    category: zStr,
    makes: zList(zStr),
    bill_of_material: zList(z.looseObject({ name: zStr, drawing_no: zStr, quantity: zNum, unit: zStr })),
    supplier_prices: zList(priceRow),
    supplier_history: zList(priceRow),
    store_price: zNum,
    taxes: zList(z.looseObject({ tax_code: zStr, name: zStr, net_rate: zNum })),
  }),
);
export type MaterialDetail = z.infer<typeof materialDetailSchema>;

export const rateRowSchema = z.looseObject({
  supplier: z.looseObject({ id: zId, code: zStr, name: zStr }).nullish(),
  material: z.looseObject({ item_id: zId, name: zStr, drawing_no: zStr, unit: zStr }).nullish(),
  make: zStr,
  make_id: zId,
  price: zNum,
  currency: zStr,
  effect_since: zStrOrNull,
  effect_till: zStrOrNull,
  status: zNum,
  remarks: zStr,
  reject_remarks: zStr,
  rate_approval_id: zId,
});
export type RateRow = z.infer<typeof rateRowSchema>;
export const ratesSchema = z.looseObject({ supplier_prices: zList(rateRowSchema) });
