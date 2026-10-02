/** @author Lokesh */
import { post, postOk } from '@/core/api';
import { lastDays, rangeParams, type DateRange } from '@/core/utils';

import { financeYearsSchema, materialStockSchema, outstandingSchema, poDashboardSchema, poDetailSchema, poListSchema, supplierProfileSchema, type PurchaseOrderRow } from './schemas';

export type PurchaseOrder = {
  id: string;
  code: string;
  draftedOn: string | null;
  approvedOn: string | null;
  supplierId: string;
  supplierName: string;
  projectCode: string;
  projectName: string;
  value: number;
  currency: string;
  quantity: number;
  unit: string;
  materialStatus: string;
  deliveryStatus: string;
  dueDays: number;
  status: number;
  poType: number;
  indentCode: string;
};

export type PoMaterial = { itemId: string; makeId: string; drawingNo: string; name: string; makeName: string; quantity: number; price: number; discount: number; unit: string; storePrice: number };

export type PoFilters = { range: DateRange; status: string; supplierId: string | null; projectCode: string | null; itemId: string | null; financeYear: string; poNo: string };
export const DEFAULT_PO_FILTERS = (): PoFilters => ({ range: lastDays(30), status: '100', supplierId: null, projectCode: null, itemId: null, financeYear: '-1', poNo: '' });

export const toPurchaseOrder = (r: PurchaseOrderRow): PurchaseOrder => ({
  id: r.po_id,
  code: r.po_code,
  draftedOn: r.drafted_on,
  approvedOn: r.approved_on,
  supplierId: r.supplier?.id ?? '',
  supplierName: r.supplier_name || r.supplier?.name || '',
  projectCode: r.project_code,
  projectName: r.project_name,
  value: r.po_value,
  currency: r.currency_symbol || '₹',
  quantity: r.quantity,
  unit: r.unit,
  materialStatus: r.material_status,
  deliveryStatus: r.delivery_status,
  dueDays: r.due_days,
  status: r.status,
  poType: r.po_type,
  indentCode: r.indent?.code ?? '',
});

export const fetchPurchaseDashboard = () => post('purchase/json/dashboard/', {}, { schema: poDashboardSchema });

export async function searchPurchaseOrders(f: PoFilters): Promise<PurchaseOrder[]> {
  const res = await post(
    'purchase/json/poSearch/',
    {
      ...rangeParams(f.range),
      po_no: f.poNo,
      status: f.status,
      supplierId: f.supplierId ?? '',
      project_code: f.projectCode ?? '',
      item_id: f.itemId ?? '',
      finance_year: f.financeYear,
    },
    { schema: poListSchema, timeoutMs: 90_000 },
  );
  return res.po_list.map(toPurchaseOrder);
}

export const fetchDraftPOs = async () => (await post('purchase/json/po_draft/', {}, { schema: poListSchema })).po_list.map(toPurchaseOrder);

export async function fetchPoMaterials(po: PurchaseOrder): Promise<PoMaterial[]> {
  const res = await post('purchase/json/poDraftDetails/', { po_id: po.id }, { schema: poDetailSchema });
  return res.materials.map((m) => ({ itemId: m.item_id, makeId: m.make_id, drawingNo: m.drawing_no, name: m.name, makeName: m.make_name, quantity: m.quantity, price: m.price, discount: m.discount, unit: m.unit, storePrice: m.store_price }));
}

export const fetchPoFinanceYears = async () => (await post('purchase/json/finance_year/', {}, { schema: financeYearsSchema })).financial_years;

const poDate = (po: PurchaseOrder) => (po.draftedOn ?? '').slice(0, 10);
const isJob = (po: PurchaseOrder) => (po.poType === 1 ? 'true' : 'false');

export const fetchSupplierProfile = (po: PurchaseOrder, m: PoMaterial) =>
  post('purchase/json/poMaterialDetail/', { item_id: m.itemId, party_id: po.supplierId, po_date: poDate(po), po_type: isJob(po) }, { schema: supplierProfileSchema });

export const fetchMaterialOverdue = async (po: PurchaseOrder, m: PoMaterial) =>
  (await post('purchase/json/poMaterial_overDue/', { item_id: m.itemId, po_party_id: po.supplierId, po_date: poDate(po), po_type: isJob(po) }, { schema: outstandingSchema })).outstanding;

export const fetchMaterialStock = (itemId: string) => post('stores/json/material_stock/', { item_id: itemId }, { schema: materialStockSchema });

export async function approvePO(po: PurchaseOrder, remarks: string) {
  await postOk('purchase/json/po/approve/', { po_id: po.id, project_code: po.projectCode, remarks, approve_po_type: po.poType });
}
export async function reviewPO(po: PurchaseOrder, remarks: string) {
  await postOk('purchase/json/po/review/', { po_id: po.id, remarks });
}
/** Server refuses to reject a PO that already has received material. */
export async function checkCanRejectPO(po: PurchaseOrder) {
  await postOk('purchase/json/po/checkpogrn/', { po_id: po.id });
}
export async function rejectPO(po: PurchaseOrder, remarks: string) {
  await postOk('purchase/json/po/reject/', { po_id: po.id, remarks });
}
