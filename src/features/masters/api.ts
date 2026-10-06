/** @author Lokesh */
import { post, postOk, ERP } from '@/core/api';
import { materialStockSchema } from '@/core/erp';

import { materialDetailSchema, partyDetailSchema, ratesSchema, type RateRow } from './schemas';

export type RateRequest = {
  id: string;
  itemId: string;
  makeId: string;
  make: string;
  materialName: string;
  drawingNo: string;
  unit: string;
  supplierId: string;
  supplierName: string;
  price: number;
  currency: string;
  effectSince: string | null;
  effectTill: string | null;
  remarks: string;
};

export const toRateRequest = (r: RateRow): RateRequest => ({
  id: r.rate_approval_id,
  itemId: r.material?.item_id ?? '',
  makeId: r.make_id,
  make: r.make,
  materialName: r.material?.name ?? '',
  drawingNo: r.material?.drawing_no ?? '',
  unit: r.material?.unit ?? '',
  supplierId: r.supplier?.id ?? '',
  supplierName: r.supplier?.name ?? '',
  price: r.price,
  currency: r.currency === 'INR' || !r.currency ? '₹' : `${r.currency} `,
  effectSince: r.effect_since,
  effectTill: r.effect_till,
  remarks: r.remarks,
});

export const fetchPartyDetail = (id: string) =>
  post(ERP.masters.partyDetail, { party_id: id }, { schema: partyDetailSchema });
export const fetchMaterialDetail = (itemId: string, makeId: string) =>
  post(ERP.masters.materialDetail, { item_id: itemId, make_id: makeId }, { schema: materialDetailSchema });
export const fetchMaterialStock = (itemId: string) =>
  post(ERP.stores.materialStock, { item_id: itemId }, { schema: materialStockSchema });
export const fetchPendingRates = async () =>
  (await post(ERP.masters.supplierPrices, {}, { schema: ratesSchema })).supplier_prices.map(toRateRequest);

const rateParams = (r: RateRequest, remarks: string) => ({
  item_id: r.itemId,
  effect_since: r.effectSince ?? '',
  updated_since: r.effectSince ?? '',
  effect_till: r.effectTill ?? '',
  updated_till: r.effectTill ?? '',
  supplier_id: r.supplierId,
  price: r.price,
  remarks,
  make_id: r.makeId,
  rate_approval_id: r.id,
});

export async function approveRate(r: RateRequest, remarks: string) {
  await postOk(ERP.masters.approveRate, rateParams(r, remarks));
}
export async function rejectRate(r: RateRequest, remarks: string) {
  await postOk(ERP.masters.rejectRate, { ...rateParams(r, r.remarks), is_approved: false, reject_remarks: remarks });
}
