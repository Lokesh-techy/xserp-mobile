/** @author Lokesh */
import * as client from '@/core/api/client';

import { DEFAULT_PO_FILTERS, searchPurchaseOrders } from './api';

test('unset filters are sent as xserp\'s "any" sentinel (-1), never empty strings', async () => {
  const spy = jest.spyOn(client, 'post').mockResolvedValue({ po_list: [] } as never);
  await searchPurchaseOrders(DEFAULT_PO_FILTERS());
  const params = spy.mock.calls[0]![1] as Record<string, unknown>;
  expect(params).toMatchObject({ po_no: '-1', supplierId: '-1', project_code: '-1', item_id: '-1', status: '100' });
});

test('set filters pass through', async () => {
  const spy = jest.spyOn(client, 'post').mockResolvedValue({ po_list: [] } as never);
  await searchPurchaseOrders({ ...DEFAULT_PO_FILTERS(), supplierId: '12', itemId: '45', projectCode: 'PRJ1', status: '2' });
  expect(spy.mock.calls.at(-1)![1]).toMatchObject({ supplierId: '12', item_id: '45', project_code: 'PRJ1', status: '2', po_no: '-1' });
});
