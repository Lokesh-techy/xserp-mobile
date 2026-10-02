/** @author Lokesh */
import { format } from 'date-fns';

import { toApiDate } from '@/core/utils';

import type { InvoiceForm, InvoiceItem } from './schema';

type ProjectRef = { id: string; code: string };
type TaxRef = { code: string; rate: number };

const lineValue = (i: InvoiceItem) => i.quantity * i.rate * (1 - i.discount / 100);
const round2 = (n: number) => Math.round(n * 100) / 100;

type BuildOptions = { projects: ProjectRef[]; taxes: TaxRef[]; withApproval: boolean; enterpriseId: number; now?: Date };

/**
 * `invoice_data` for sales/json/save_invoice_page/. xserp's device save path
 * (erp/sales/backend.py: __copyInvoiceHeaderDataToEntity, __extractInvoiceMaterialsFromData,
 * __extractInvoiceChargesFromData) reads every key below with `[]`, so each must be present even when empty.
 */
export function buildInvoicePayload(form: InvoiceForm, { projects, taxes, withApproval, enterpriseId, now = new Date() }: BuildOptions) {
  const charge = (name: string, rate: number) => ({ enterprise_id: enterpriseId, item_name: name, hsn_code: '', is_percent: false, rate, discount: 0, taxes: [] });
  return {
    id: '',
    enterprise_id: enterpriseId,
    status: withApproval ? 1 : 0,
    type: form.type,
    party_id: form.partyId,
    project_code: projects.find((p) => p.id === form.projectId)?.code ?? '',
    sale_account_id: form.saleAccountId,
    job_po_id: 0, // not a job-order invoice; the server int()-s this field
    po_no: form.poNo,
    po_date: form.poDate ? toApiDate(form.poDate) : '',
    order_accept_no: '',
    order_accept_date: '',
    issued_on: format(now, 'yyyy-MM-dd HH:mm:ss'),
    issued_to: '',
    issued_for: '',
    deliver_to: form.deliverTo,
    ship_to_name: '',
    gstin: form.gstin,
    ecommerce_gstin: '',
    currency_id: null,
    currency_conversion_rate: 1,
    round_off: 0,
    grand_total: invoiceTotals(form, taxes).total,
    // Free text; xserp only parses it as an instalment schedule when it is that JSON shape.
    payment_terms: form.paymentTerms.trim(),
    transport_mode: form.transportMode,
    lr_no: form.lrNo,
    road_permit_no: form.roadPermitNo,
    packing_slip_no: form.packingSlipNo,
    packing_description: form.packingDescription,
    special_instruction: form.specialInstruction,
    notes: form.notes,
    remarks: '',
    return_date: null,
    tax_payable_on_reverse_charge: false,
    goods_already_supplied: false,
    no_of_consignment: 0,
    weight: 0,
    is_courier: 0,
    location_id: null,
    document: '',
    tags: [],
    taxes: [],
    items: form.items.map((i, index) => ({
      item_id: i.itemId,
      enterprise_id: enterpriseId,
      make_id: i.makeId,
      is_faulty: 0,
      alternate_unit_id: null,
      quantity: i.quantity,
      rate: i.rate,
      discount: i.discount,
      unit: i.unit,
      hsn_code: i.hsnCode,
      from_date: '',
      to_date: '',
      DELETE: false,
      entry_order: index + 1,
      is_returnable: false,
      remarks: '',
      inspection_log: [],
      taxes: i.taxCodes.map((code) => ({ tax_code: code, enterprise_id: enterpriseId })),
    })),
    charges: [charge('Packing', form.packingCharges), charge('Transport', form.transportCharges)].filter((c) => c.rate > 0),
  };
}

/** Client-side preview only; the server computes the authoritative totals. */
export function invoiceTotals(form: Pick<InvoiceForm, 'items' | 'packingCharges' | 'transportCharges'>, taxes: TaxRef[]) {
  const rate = (code: string) => taxes.find((t) => t.code === code)?.rate ?? 0;
  const subtotal = round2(form.items.reduce((s, i) => s + lineValue(i), 0));
  const tax = round2(form.items.reduce((s, i) => s + lineValue(i) * (i.taxCodes.reduce((r, c) => r + rate(c), 0) / 100), 0));
  const charges = round2(form.packingCharges + form.transportCharges);
  return { subtotal, tax, charges, total: round2(subtotal + tax + charges) };
}
