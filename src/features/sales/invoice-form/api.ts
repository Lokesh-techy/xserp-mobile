/** @author Lokesh */
import { z } from 'zod';

import { post, zId, zList, zNum, zStr, ERP } from '@/core/api';

const ref = z.looseObject({
  id: zId,
  party_id: zId.optional(),
  name: zStr,
  party_name: zStr.optional(),
  code: zStr,
  project_code: zStr.optional(),
});
const frequentSchema = z.looseObject({ frequently_used_parties: zList(ref), frequently_used_projects: zList(ref) });

export async function fetchFrequentPicks() {
  const r = await post(ERP.masters.frequentlyUsed, { type: 'invoice' }, { schema: frequentSchema });
  return {
    partyIds: r.frequently_used_parties.map((p) => p.party_id || p.id).filter(Boolean),
    projectIds: r.frequently_used_projects.map((p) => p.id).filter(Boolean),
  };
}

const lastUsedSchema = z.looseObject({
  party_details: z
    .looseObject({ trans_mode: zStr, Packing_desc: zStr, delivery_address: zStr, gstin: zStr, payment_term: zStr })
    .nullish(),
});

export async function fetchLastUsedDetails(partyId: string) {
  const d = (await post(ERP.stores.lastUsedSupplierDetails, { party_id: partyId }, { schema: lastUsedSchema }))
    .party_details;
  return d
    ? {
        transportMode: d.trans_mode,
        packingDescription: d.Packing_desc,
        deliverTo: d.delivery_address,
        gstin: d.gstin,
        paymentTerms: d.payment_term,
      }
    : null;
}

const rateSchema = z.looseObject({
  rate: zNum.optional(),
  discount: zNum.optional(),
  item_rate: z.looseObject({ rate: zNum, discount: zNum }).nullish(),
});

export async function fetchPartyRate(partyId: string, itemId: string, makeId: string) {
  const r = await post(
    ERP.sales.loadPartyRate,
    { party_id: partyId, item_id: itemId, make_id: makeId },
    { schema: rateSchema },
  );
  return { rate: r.item_rate?.rate ?? r.rate ?? 0, discount: r.item_rate?.discount ?? r.discount ?? 0 };
}

const stockSchema = z.looseObject({ closing_stock: zNum });

export async function fetchStockOnHand(itemId: string, makeId: string) {
  return (
    await post(
      ERP.stores.stockCheck,
      { item_id: itemId, make_id: makeId, is_faulty: 0, exclude_drafts: 1 },
      { schema: stockSchema },
    )
  ).closing_stock;
}

const savedSchema = z.looseObject({ invoice_id: zId.optional(), invoice_code: zStr.optional() });

export async function saveInvoice(invoiceData: Record<string, unknown>) {
  return post(ERP.sales.saveInvoice, { invoice_data: invoiceData }, { schema: savedSchema, timeoutMs: 120_000 });
}
