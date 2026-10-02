/** @author Lokesh */
import { invoiceFormSchema, invoiceItemSchema, isValidGstin, EMPTY_INVOICE } from './schema';
import { STEPS, stepStates } from './steps';

const item = { itemId: '45', makeId: '1', name: 'Copper', unit: 'Kg', hsnCode: '7408', quantity: 1, rate: 10, discount: 0, taxCodes: [] };

test('GSTIN must be a valid 15-character GSTIN when given', () => {
  expect(isValidGstin('33AAAAA0000A1Z5')).toBe(true);
  expect(isValidGstin('33aaaaa0000a1z5')).toBe(true);
  expect(isValidGstin('33AAAAA0000A1Z')).toBe(false);
  expect(isValidGstin('XXAAAAA0000A1Z5')).toBe(false);
  const r = invoiceFormSchema.safeParse({ ...EMPTY_INVOICE, partyId: '1', projectId: '1', saleAccountId: '1', items: [item], gstin: 'BAD' });
  expect(r.success).toBe(false);
  expect(invoiceFormSchema.safeParse({ ...EMPTY_INVOICE, partyId: '1', projectId: '1', saleAccountId: '1', items: [item], gstin: '' }).success).toBe(true);
});

test('line items: quantity > 0, rate >= 0, discount 0–100', () => {
  expect(invoiceItemSchema.safeParse({ ...item, quantity: 0 }).success).toBe(false);
  expect(invoiceItemSchema.safeParse({ ...item, rate: -1 }).success).toBe(false);
  expect(invoiceItemSchema.safeParse({ ...item, discount: 101 }).success).toBe(false);
  expect(invoiceItemSchema.safeParse(item).success).toBe(true);
});

test('customer PO date cannot be in the future', () => {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const r = invoiceFormSchema.safeParse({ ...EMPTY_INVOICE, partyId: '1', projectId: '1', saleAccountId: '1', items: [item], poDate: tomorrow });
  expect(r.success).toBe(false);
});

test('step states: done, error, current, upcoming', () => {
  const s = stepStates({ current: 2, visited: 2, errors: ['partyId'] });
  expect(s.map((x) => x.state)).toEqual(['error', 'done', 'current', 'upcoming', 'upcoming']);
  expect(s[0]!.reachable && s[3]!.reachable === false).toBe(true);
  expect(STEPS).toHaveLength(5);
});
