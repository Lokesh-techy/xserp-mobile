/** @author Lokesh */
import dashboard from '../../../__fixtures__/purchase/dashboard.json';
import detail from '../../../__fixtures__/purchase/poDraftDetails.json';
import drafts from '../../../__fixtures__/purchase/po_draft.json';
import fy from '../../../__fixtures__/purchase/finance_year.json';
import overdue from '../../../__fixtures__/purchase/poMaterial_overDue.json';
import profile from '../../../__fixtures__/purchase/poMaterialDetail.json';
import search from '../../../__fixtures__/purchase/poSearch.json';

import { toPurchaseOrder } from './api';
import { financeYearsSchema, outstandingSchema, poDashboardSchema, poDetailSchema, poListSchema, supplierProfileSchema } from './schemas';
import { poStatus } from './status';

test('fixtures parse', () => {
  expect(() => poDashboardSchema.parse(dashboard)).not.toThrow();
  expect(poListSchema.parse(drafts).po_list.length).toBeGreaterThanOrEqual(0);
  expect(() => poListSchema.parse(search)).not.toThrow();
  expect(() => poDetailSchema.parse(detail)).not.toThrow();
  expect(() => financeYearsSchema.parse(fy)).not.toThrow();
  expect(() => supplierProfileSchema.parse(profile)).not.toThrow();
  expect(() => outstandingSchema.parse(overdue)).not.toThrow();
});

test('maps a PO row', () => {
  const row = poListSchema.parse({ po_list: [{ po_id: 31, po_code: 'PO/25-26/0012', po_value: '12,500.00', status: '0', supplier_name: 'Acme', currency_symbol: '' }] }).po_list[0]!;
  const po = toPurchaseOrder(row);
  expect(po).toMatchObject({ id: '31', code: 'PO/25-26/0012', value: 12500, status: 0, supplierName: 'Acme', currency: '₹' });
});

test('status labels', () => {
  expect(poStatus(0)).toEqual({ label: 'Draft', tone: 'warning' });
  expect(poStatus(1)).toEqual({ label: 'Reviewed', tone: 'info' });
  expect(poStatus(2)).toEqual({ label: 'Approved', tone: 'success' });
  expect(poStatus(3)).toEqual({ label: 'Rejected', tone: 'danger' });
  expect(poStatus(-1).tone).toBe('neutral');
});
