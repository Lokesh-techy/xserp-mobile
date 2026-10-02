/** @author Lokesh */
import dashboard from '../../../__fixtures__/stores/dashboard_data.json';
import drafts from '../../../__fixtures__/stores/grn_draft.json';
import grn from '../../../__fixtures__/stores/grnStatus.json';
import indent from '../../../__fixtures__/stores/indentStatus.json';
import stock from '../../../__fixtures__/stores/stockCheck.json';
import * as client from '@/core/api/client';
import { toSession, userPayloadSchema } from '@/core/auth';
import login from '../../../__fixtures__/login_api.json';

import { approveGrn, rejectGrn, toMovements, toReceipt } from './api';
import { grnListSchema, grnStatusSchema, indentStatusSchema, stockCheckSchema, storeDashboardSchema } from './schemas';

test('fixtures parse', () => {
  expect(storeDashboardSchema.parse(dashboard).stock_statement?.opening_stock).toBe(1500000);
  expect(indentStatusSchema.parse(indent).indent_pending).toBe(8);
  expect(grnStatusSchema.parse(grn).grn_inprocess).toBe(5);
  expect(grnListSchema.parse(drafts).grn_list).toHaveLength(1);
  expect(stockCheckSchema.parse(stock).closing_stock).toBe(25);
});

test('receipt mapping turns a single document object into an array', () => {
  const r = toReceipt(grnListSchema.parse(drafts).grn_list[0]!);
  expect(r).toMatchObject({ receiptNo: '7001', code: '25-26/GRN/0101', invoiceValue: 118000, supplierName: 'Acme Ltd' });
  expect(r.documents).toEqual([{ uid: 'abc', ext: 'pdf', name: 'inv.pdf' }]);
  expect(r.materials[0]).toMatchObject({ name: 'Copper wire', acceptedQty: 98 });
  expect(r.remarks[0]).toEqual({ by: 'Store', date: '2026-09-27', text: 'Checked at gate' });
});

test('stock movements prefer material_stock and stock_details', () => {
  expect(toMovements(stockCheckSchema.parse(stock))).toEqual([
    { date: '2026-09-01', docNo: 'GRN/0101', issue: 0, receipt: 20 },
    { date: '2026-09-05', docNo: 'ISS/0044', issue: 5, receipt: 0 },
  ]);
});

test('approve sends ICD flags and fy_start_day from the session; reject flags is_flag', async () => {
  const spy = jest.spyOn(client, 'postOk').mockResolvedValue({ response_code: 200 });
  const session = { ...toSession(userPayloadSchema.parse(login)), icd: { enabled: true, ignoreCreditNote: false, autoGenVoucher: true } };
  const r = toReceipt(grnListSchema.parse(drafts).grn_list[0]!);
  await approveGrn(r, 'ok', session);
  expect(spy).toHaveBeenCalledWith('stores/json/grn/approve/', { receipt_no: '7001', fy_start_day: '01/04', icd: true, icd_auto_gen_voucher: true, icd_ignore_credit_note: false, remarks: 'ok' });
  await rejectGrn(r, 'damaged');
  expect(spy).toHaveBeenLastCalledWith('stores/json/grn/reject/', { receipt_no: '7001', remarks: 'damaged', is_flag: true });
});
