/** @author Lokesh */
import { buildInvoicePayload, invoiceTotals } from './build-payload';
import type { InvoiceForm } from './schema';

const taxes = [
  { code: 'CGST9', name: 'CGST 9%', rate: 9 },
  { code: 'SGST9', name: 'SGST 9%', rate: 9 },
];
const projects = [{ id: 'p1', code: 'PRJ1', name: 'Solar' }];

const form = (over: Partial<InvoiceForm> = {}): InvoiceForm => ({
  type: 'GST',
  partyId: '12',
  projectId: 'p1',
  saleAccountId: '301',
  poNo: 'PO-9',
  poDate: new Date(2026, 8, 30),
  deliverTo: 'Chennai',
  gstin: '33AAAAA0000A1Z5',
  items: [
    { itemId: '45', makeId: '1', name: 'Copper wire', unit: 'Kg', hsnCode: '7408', quantity: 10, rate: 100, discount: 10, taxCodes: ['CGST9', 'SGST9'] },
    { itemId: '46', makeId: '1', name: 'Lug', unit: 'Nos', hsnCode: '8536', quantity: 2, rate: 50, discount: 0, taxCodes: [] },
  ],
  packingCharges: 0,
  transportCharges: 150,
  paymentTerms: '30 days',
  transportMode: 'Road',
  lrNo: '',
  roadPermitNo: '',
  packingSlipNo: '',
  packingDescription: '',
  specialInstruction: '',
  notes: '',
  ...over,
});

test('builds the XSManager invoice_data shape', () => {
  const p = buildInvoicePayload(form(), { projects, taxes, withApproval: false, enterpriseId: 102, now: new Date(2026, 9, 2, 10, 30) });
  expect(p).toMatchObject({
    type: 'GST',
    status: 0,
    party_id: '12',
    project_code: 'PRJ1',
    sale_account_id: '301',
    po_no: 'PO-9',
    po_date: '2026-09-30',
    items: [
      { item_id: '45', make_id: '1', quantity: 10, rate: 100, discount: 10, unit: 'Kg', hsn_code: '7408', taxes: [{ tax_code: 'CGST9' }, { tax_code: 'SGST9' }] },
      { item_id: '46', taxes: [] },
    ],
    charges: [{ item_name: 'Transport', rate: 150 }],
    payment_terms: '30 days',
  });
});

test('zero charges and empty terms are omitted; status follows withApproval', () => {
  const p = buildInvoicePayload(form({ transportCharges: 0, paymentTerms: '', poDate: null }), { projects, taxes, withApproval: true, enterpriseId: 102, now: new Date() });
  expect(p.status).toBe(1);
  expect(p.charges).toEqual([]);
  expect(p.payment_terms).toBe('');
  expect(p.po_date).toBe('');
});

test('totals apply discount then line taxes, plus charges', () => {
  const t = invoiceTotals(form(), taxes);
  // line1: 10*100*0.9 = 900, tax 18% = 162; line2: 100, no tax; charges 150
  expect(t).toEqual({ subtotal: 1000, tax: 162, charges: 150, total: 1312 });
});

// Keys xserp-schnell/erp/sales/backend.py reads with [] (a missing key aborts the save) — see
// __copyInvoiceHeaderDataToEntity, __extractInvoiceMaterialsFromData, __extractInvoiceChargesFromData.
const HEADER_KEYS = ['id', 'enterprise_id', 'po_date', 'po_no', 'party_id', 'order_accept_no', 'order_accept_date', 'transport_mode', 'lr_no', 'road_permit_no', 'packing_slip_no', 'packing_description', 'grand_total', 'type', 'issued_to', 'issued_for', 'project_code', 'deliver_to', 'gstin', 'ship_to_name', 'round_off', 'currency_id', 'payment_terms', 'special_instruction', 'notes', 'currency_conversion_rate', 'return_date', 'issued_on', 'tax_payable_on_reverse_charge', 'goods_already_supplied', 'ecommerce_gstin', 'sale_account_id', 'job_po_id', 'no_of_consignment', 'weight', 'is_courier', 'location_id', 'document', 'items', 'charges', 'taxes', 'tags', 'remarks', 'status'];
const ITEM_KEYS = ['item_id', 'enterprise_id', 'make_id', 'is_faulty', 'alternate_unit_id', 'quantity', 'rate', 'from_date', 'to_date', 'DELETE', 'hsn_code', 'discount', 'entry_order', 'is_returnable', 'taxes', 'inspection_log', 'remarks'];
const CHARGE_KEYS = ['enterprise_id', 'item_name', 'hsn_code', 'is_percent', 'rate', 'discount', 'taxes'];

test('payload carries every key the backend indexes directly', () => {
  const p = buildInvoicePayload(form({ packingCharges: 20 }), { projects, taxes, withApproval: false, enterpriseId: 102, now: new Date(2026, 9, 2, 10, 30) });
  for (const k of HEADER_KEYS) expect(p).toHaveProperty([k]);
  for (const item of p.items) for (const k of ITEM_KEYS) expect(item).toHaveProperty([k]);
  for (const c of p.charges) for (const k of CHARGE_KEYS) expect(c).toHaveProperty([k]);
  expect(p).toMatchObject({ id: '', enterprise_id: 102, job_po_id: 0, grand_total: 1332, issued_on: '2026-10-02 10:30:00', round_off: 0, currency_conversion_rate: 1 });
  expect(p.items[0]).toMatchObject({ enterprise_id: 102, is_faulty: 0, DELETE: false, entry_order: 1, is_returnable: false, from_date: '', to_date: '', inspection_log: [] });
});
