/** @author Lokesh */
import { z } from 'zod';

// GSTIN: 2-digit state code, PAN (5 letters, 4 digits, 1 letter), entity number, 'Z', checksum.
const GSTIN = /^(0[1-9]|[1-3][0-9])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const isValidGstin = (v: string) => GSTIN.test(v.trim().toUpperCase());

export const INVOICE_TYPES = ['GST', 'TRADING', 'Service', 'BoS', 'EXCISE'] as const;

export const invoiceItemSchema = z.object({
  itemId: z.string(),
  makeId: z.string(),
  name: z.string(),
  unit: z.string(),
  hsnCode: z.string(),
  quantity: z.number({ error: 'Enter a quantity' }).positive('Quantity must be more than 0'),
  rate: z.number({ error: 'Enter a rate' }).nonnegative('Rate cannot be negative'),
  discount: z.number().min(0).max(100, 'Discount is a percentage (0–100)'),
  taxCodes: z.array(z.string()),
});
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

export const invoiceFormSchema = z.object({
  type: z.enum(INVOICE_TYPES),
  partyId: z.string().min(1, 'Choose a customer'),
  projectId: z.string().min(1, 'Choose a project'),
  saleAccountId: z.string().min(1, 'Choose a sales account'),
  poNo: z.string(),
  poDate: z
    .date()
    .nullable()
    .refine((d) => !d || d.getTime() <= Date.now(), 'Customer PO date cannot be in the future'),
  deliverTo: z.string(),
  gstin: z.string().refine((v) => v.trim() === '' || isValidGstin(v), 'Enter a valid 15-character GSTIN'),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one item'),
  packingCharges: z.number().nonnegative('Charges cannot be negative'),
  transportCharges: z.number().nonnegative('Charges cannot be negative'),
  paymentTerms: z.string(),
  transportMode: z.string(),
  lrNo: z.string(),
  roadPermitNo: z.string(),
  packingSlipNo: z.string(),
  packingDescription: z.string(),
  specialInstruction: z.string(),
  notes: z.string(),
});
export type InvoiceForm = z.infer<typeof invoiceFormSchema>;

export const EMPTY_INVOICE: InvoiceForm = {
  type: 'GST',
  partyId: '',
  projectId: '',
  saleAccountId: '',
  poNo: '',
  poDate: null,
  deliverTo: '',
  gstin: '',
  items: [],
  packingCharges: 0,
  transportCharges: 0,
  paymentTerms: '',
  transportMode: '',
  lrNo: '',
  roadPermitNo: '',
  packingSlipNo: '',
  packingDescription: '',
  specialInstruction: '',
  notes: '',
};
