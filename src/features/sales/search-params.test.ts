/** @author Lokesh */
import * as client from '@/core/api/client';

import { DEFAULT_SALES_FILTERS, searchInvoices, searchOAs } from './api';

test('invoice and OA searches send -1 for unset filters', async () => {
  const spy = jest.spyOn(client, 'post').mockResolvedValue({ invoice_list: [], oa_list: [] } as never);
  await searchInvoices(DEFAULT_SALES_FILTERS('invoice'));
  await searchOAs(DEFAULT_SALES_FILTERS('oa'));
  expect(spy.mock.calls[0]![1]).toMatchObject({ invoiceNo: '-1', customerId: '-1', project_code: '-1', item_id: '-1', status: '100' });
  expect(spy.mock.calls[1]![1]).toMatchObject({ oa_no: '-1', supplier_id: '-1', project_code: '-1', item_id: '-1', status: '100' });
});
