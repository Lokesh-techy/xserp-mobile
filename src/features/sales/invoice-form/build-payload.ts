/** @author Lokesh */
import { toApiDate } from '@/core/utils';

import type { InvoiceForm, InvoiceItem } from './schema';

type ProjectRef = { id: string; code: string };
type TaxRef = { code: string; rate: number };

const lineValue = (i: InvoiceItem) => i.quantity * i.rate * (1 - i.discount / 100);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** `invoice_data` for sales/json/save_invoice_page/ — the shape XSManager's Invoice model serialised to. */
export function buildInvoicePayload(form: InvoiceForm, { projects, withApproval }: { projects: ProjectRef[]; withApproval: boolean }) {
  return {
    type: form.type,
    status: withApproval ? 1 : 0,
    party_id: form.partyId,
    project_code: projects.find((p) => p.id === form.projectId)?.code ?? '',
    sale_account_id: form.saleAccountId,
    po_no: form.poNo,
    po_date: form.poDate ? toApiDate(form.poDate) : '',
    deliver_to: form.deliverTo,
    gstin: form.gstin,
    items: form.items.map((i) => ({
      item_id: i.itemId,
      make_id: i.makeId,
      quantity: i.quantity,
      rate: i.rate,
      discount: i.discount,
      unit: i.unit,
      hsn_code: i.hsnCode,
      taxes: i.taxCodes.map((code) => ({ tax_code: code })),
    })),
    charges: [
      { item_name: 'Packing', rate: form.packingCharges },
      { item_name: 'Transport', rate: form.transportCharges },
    ].filter((c) => c.rate > 0),
    payment_terms: form.paymentTerms.trim() ? [{ description_name: form.paymentTerms.trim() }] : [],
    transport_mode: form.transportMode,
    lr_no: form.lrNo,
    road_permit_no: form.roadPermitNo,
    packing_slip_no: form.packingSlipNo,
    packing_description: form.packingDescription,
    special_instruction: form.specialInstruction,
    notes: form.notes,
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
