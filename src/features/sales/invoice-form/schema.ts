/** @author Lokesh */
import { z } from 'zod';

export const INVOICE_TYPES = ['GST', 'TRADING', 'Service', 'BoS', 'EXCISE'] as const;

export const invoiceItemSchema = z.object({
  itemId: z.string(),
  makeId: z.string(),
  name: z.string(),
  unit: z.string(),
  hsnCode: z.string(),
  quantity: z.number().positive('Quantity must be more than 0'),
  rate: z.number().nonnegative('Rate cannot be negative'),
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
  poDate: z.date().nullable(),
  deliverTo: z.string(),
  gstin: z.string(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one item'),
  packingCharges: z.number().nonnegative(),
  transportCharges: z.number().nonnegative(),
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
