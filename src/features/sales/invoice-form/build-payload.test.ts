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
  const p = buildInvoicePayload(form(), { projects, withApproval: false });
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
    payment_terms: [{ description_name: '30 days' }],
  });
});

test('zero charges and empty terms are omitted; status follows withApproval', () => {
  const p = buildInvoicePayload(form({ transportCharges: 0, paymentTerms: '', poDate: null }), { projects, withApproval: true });
  expect(p.status).toBe(1);
  expect(p.charges).toEqual([]);
  expect(p.payment_terms).toEqual([]);
  expect(p.po_date).toBe('');
});

test('totals apply discount then line taxes, plus charges', () => {
  const t = invoiceTotals(form(), taxes);
  // line1: 10*100*0.9 = 900, tax 18% = 162; line2: 100, no tax; charges 150
  expect(t).toEqual({ subtotal: 1000, tax: 162, charges: 150, total: 1312 });
});
