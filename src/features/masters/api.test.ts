/** @author Lokesh */
import material from '../../../__fixtures__/masters/material_detail.json';
import party from '../../../__fixtures__/masters/party_detail.json';
import rates from '../../../__fixtures__/masters/supplierPrices.json';
import * as client from '@/core/api/client';

import { approveRate, rejectRate, toRateRequest } from './api';
import { materialDetailSchema, partyDetailSchema, ratesSchema } from './schemas';

test('party detail parses whether nested under party or top level', () => {
  expect(partyDetailSchema.parse(party)).toMatchObject({ name: 'Acme Ltd', is_supplier: true, gst_no: '33AAAAA0000A1Z5' });
  expect(partyDetailSchema.parse({ response_code: 200, id: 1, name: 'Flat' }).name).toBe('Flat');
});

test('material detail parses', () => {
  const m = materialDetailSchema.parse(material);
  expect(m).toMatchObject({ price: 125.5, store_price: 120, makes: ['-NA-', 'Polycab'] });
  expect(m.supplier_history).toHaveLength(2);
  expect(m.taxes[0]?.net_rate).toBe(18);
});

test('rate request mapping', () => {
  const r = toRateRequest(ratesSchema.parse(rates).supplier_prices[0]!);
  expect(r).toMatchObject({ id: '77', itemId: '45', makeId: '1', supplierId: '12', supplierName: 'Acme Ltd', materialName: 'Copper wire', price: 130 });
});

test('approve and reject payloads', async () => {
  const spy = jest.spyOn(client, 'postOk').mockResolvedValue({ response_code: 200 });
  const r = toRateRequest(ratesSchema.parse(rates).supplier_prices[0]!);
  await approveRate(r, 'ok');
  expect(spy).toHaveBeenCalledWith('masters/json/material/approveRate/', {
    item_id: '45', effect_since: '2026-10-01', updated_since: '2026-10-01', effect_till: '2027-03-31', updated_till: '2027-03-31', supplier_id: '12', price: 130, remarks: 'ok', make_id: '1', rate_approval_id: '77',
  });
  await rejectRate(r, 'too high');
  expect(spy).toHaveBeenLastCalledWith('masters/json/material/rejectRate/', expect.objectContaining({ is_approved: false, reject_remarks: 'too high', rate_approval_id: '77' }));
});
