/** @author Lokesh */
import { post, postOk } from '@/core/api';
import { agingSchema, financeYearsSchema, outstandingSchema } from '@/core/erp';
import { lastDays, rangeParams, type DateRange } from '@/core/utils';
import { z } from 'zod';

import { invoiceListSchema, oaListSchema, salesDashboardSchema, salesDetailSchema, salesMaterialsSchema, type InvoiceRow, type OaRow } from './schemas';

export type Invoice = {
  id: string;
  code: string;
  type: string;
  status: number;
  date: string | null;
  approvedOn: string | null;
  partyId: string;
  partyName: string;
  gstin: string;
  projectCode: string;
  projectName: string;
  value: number;
  currency: string;
  dueOn: string | null;
  dueDays: number;
  paymentStatus: string;
  poNo: string;
};

export type OA = {
  id: string;
  code: string;
  status: number;
  preparedOn: string | null;
  approvedOn: string | null;
  deliveryDue: string | null;
  partyId: string;
  partyName: string;
  projectCode: string;
  projectName: string;
  value: number;
  currency: string;
  quantity: number;
  documentUri: string;
  attached: boolean;
};

export type SalesMaterial = { key: string; itemId: string; makeId: string; name: string; drawingNo: string; makeName: string; quantity: number; rate: number; discount: number; unit: string };

export type SalesFilters = { kind: 'invoice' | 'oa'; range: DateRange; status: string; partyId: string | null; projectCode: string | null; itemId: string | null; financeYear: string; number: string };
export const DEFAULT_SALES_FILTERS = (kind: SalesFilters['kind'] = 'invoice'): SalesFilters => ({ kind, range: lastDays(30), status: '100', partyId: null, projectCode: null, itemId: null, financeYear: '-1', number: '' });

export const toInvoice = (r: InvoiceRow): Invoice => ({
  id: r.id,
  code: r.invoice_code || r.invoice_no,
  type: r.type,
  status: r.status,
  date: r.issued_on ?? r.date,
  approvedOn: r.approved_on,
  partyId: r.party_id,
  partyName: r.party_name,
  gstin: r.gstin,
  projectCode: r.project_code,
  projectName: r.project_name,
  value: r.grand_total || r.value,
  currency: r.currency_symbol || '₹',
  dueOn: r.due_on,
  dueDays: r.due_days,
  paymentStatus: r.payment_status,
  poNo: r.po_no,
});

export const toOA = (r: OaRow): OA => ({
  id: r.id,
  code: r.oa_code || r.oa_no,
  status: r.status,
  preparedOn: r.prepared_on ?? r.po_date,
  approvedOn: r.approved_on,
  deliveryDue: r.delivery_due_date,
  partyId: r.supplier?.id ?? '',
  partyName: r.supplier?.name ?? '',
  projectCode: r.project_code,
  projectName: r.project_name,
  value: r.grand_total,
  currency: r.currency_symbol || '₹',
  quantity: r.quantity,
  documentUri: r.document,
  attached: r.is_attached,
});

const toMaterials = (res: z.infer<typeof salesMaterialsSchema>): SalesMaterial[] =>
  res.materials.map((m) => ({ key: `${m.item_id}:${m.make_id}`, itemId: m.item_id, makeId: m.make_id, name: m.name, drawingNo: m.drawing_no, makeName: m.make_name, quantity: m.quantity, rate: m.rate || m.price, discount: m.discount, unit: m.unit }));

export const fetchSalesDashboard = () => post('sales/json/dashboard/', {}, { schema: salesDashboardSchema });
export const fetchSalesDetail = (range: DateRange) => post('sales/json/salesDetail/', rangeParams(range, ['from_date', 'to_date']), { schema: salesDetailSchema });
const receivableSchema = z.looseObject({ receivable_aging: agingSchema.nullish() });
export const fetchReceivableAging = async () => (await post('accounts/json/aging/', {}, { schema: receivableSchema })).receivable_aging ?? null;

export async function searchInvoices(f: SalesFilters): Promise<Invoice[]> {
  const res = await post(
    'sales/json/invoiceSearch/',
    { ...rangeParams(f.range), invoiceNo: f.number, customerId: f.partyId ?? '', project_code: f.projectCode ?? '', item_id: f.itemId ?? '-1', status: f.status, finance_year: f.financeYear },
    { schema: invoiceListSchema, timeoutMs: 90_000 },
  );
  return res.invoice_list.map(toInvoice);
}

export async function searchOAs(f: SalesFilters): Promise<OA[]> {
  const res = await post(
    'sales/json/oa_search/',
    { ...rangeParams(f.range), oa_no: f.number, supplier_id: f.partyId ?? '', project_code: f.projectCode ?? '', item_id: f.itemId ?? '-1', status: f.status, finance_year: f.financeYear },
    { schema: oaListSchema, timeoutMs: 90_000 },
  );
  return res.oa_list.map(toOA);
}

export const fetchInvoiceFinanceYears = async () => (await post('sales/json/finance_year/', {}, { schema: financeYearsSchema })).financial_years;
export const fetchOaFinanceYears = async () => (await post('sales/json/oa_finance_year/', {}, { schema: financeYearsSchema })).financial_years;

export const fetchDraftInvoices = async () => (await post('sales/json/draft_invoice_fetch/', {}, { schema: invoiceListSchema })).invoice_list.map(toInvoice);
export const fetchDraftOAs = async () => (await post('sales/json/draft_oa/', {}, { schema: oaListSchema })).oa_list.map(toOA);
export const fetchInvoiceMaterials = async (inv: Invoice) => toMaterials(await post('sales/json/invoice_material/', { invoice_id: inv.id }, { schema: salesMaterialsSchema }));
export const fetchOaMaterials = async (oa: OA) => toMaterials(await post('sales/json/oa_material/', { oa_id: oa.id }, { schema: salesMaterialsSchema }));
export const fetchPartyOverdue = async (partyId: string) => (await post('sales/json/invoice_material_overdue/', { party_id: partyId }, { schema: outstandingSchema })).outstanding;

export async function approveInvoice(inv: Invoice, remarks: string) {
  await postOk('sales/invoice/approve/', { invoice_id: inv.id, remarks });
}
export async function rejectInvoice(inv: Invoice, remarks: string) {
  await postOk('sales/invoice/reject/', { invoice_id: inv.id, remarks });
}
export async function approveOA(oa: OA, remarks: string) {
  await postOk('sales/oa/approve/', { oa_id: oa.id, project_code: oa.projectCode, approved_remarks: remarks, remarks });
}
/** Server refuses to reject an OA that has invoiced quantity. */
export async function checkCanRejectOA(oa: OA) {
  await postOk('sales/json/oa/checkoainvoice_qty/', { oa_id: oa.id });
}
export async function rejectOA(oa: OA, remarks: string) {
  await postOk('sales/oa/reject/', { oa_id: oa.id, remarks });
}
