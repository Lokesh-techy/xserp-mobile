/** @author Lokesh */
import dashboard from '../../../__fixtures__/sales/dashboard.json';
import drafts from '../../../__fixtures__/sales/draft_invoice_fetch.json';
import oas from '../../../__fixtures__/sales/draft_oa.json';
import fy from '../../../__fixtures__/sales/finance_year.json';
import materials from '../../../__fixtures__/sales/invoice_material.json';
import detail from '../../../__fixtures__/sales/salesDetail.json';

import { financeYearsSchema } from '@/core/erp';

import { toInvoice, toOA } from './api';
import { invoiceListSchema, oaListSchema, salesDashboardSchema, salesDetailSchema, salesMaterialsSchema } from './schemas';
import { invoiceStatus, oaStatus } from './status';

test('fixtures parse', () => {
  expect(salesDashboardSchema.parse(dashboard).sales_performance[0]?.value).toBe(450000);
  expect(salesDetailSchema.parse(detail).collection_on_time).toBe(250000);
  expect(invoiceListSchema.parse(drafts).invoice_list).toHaveLength(1);
  expect(oaListSchema.parse(oas).oa_list).toHaveLength(1);
  expect(salesMaterialsSchema.parse(materials).materials[0]?.rate).toBe(1000);
  expect(financeYearsSchema.parse(fy).financial_years).toEqual(['25-26']);
});

test('toInvoice prefers invoice_code and grand_total', () => {
  const inv = toInvoice(invoiceListSchema.parse(drafts).invoice_list[0]!);
  expect(inv).toMatchObject({ id: '91', code: '25-26/INV/0042', value: 11800, partyId: '12', partyName: 'Acme Ltd', status: 0 });
  const bare = toInvoice(invoiceListSchema.parse({ invoice_list: [{ id: 1, invoice_no: '7', value: 50 }] }).invoice_list[0]!);
  expect(bare).toMatchObject({ code: '7', value: 50, currency: '₹' });
});

test('toOA reads the party from supplier', () => {
  const oa = toOA(oaListSchema.parse(oas).oa_list[0]!);
  expect(oa).toMatchObject({ id: '55', code: '25-26/OA/0007', partyId: '13', partyName: 'Globex', value: 250000, attached: true, documentUri: 'oa/55/po.pdf' });
});

test('status maps', () => {
  expect(invoiceStatus(0)).toEqual({ label: 'Pending', tone: 'warning' });
  expect(invoiceStatus(1)).toEqual({ label: 'Approved', tone: 'success' });
  expect(invoiceStatus(-1)).toEqual({ label: 'Cancelled', tone: 'danger' });
  expect(oaStatus(0)).toEqual({ label: 'Draft', tone: 'warning' });
  expect(oaStatus(2)).toEqual({ label: 'Rejected', tone: 'danger' });
  expect(oaStatus(9).tone).toBe('neutral');
});
