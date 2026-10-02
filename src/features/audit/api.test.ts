/** @author Lokesh */
import materials from '../../../__fixtures__/audit/grnMaterials.json';
import pending from '../../../__fixtures__/audit/pendingGrn.json';
import * as client from '@/core/api/client';

import { fetchPendingGrnNotes, returnGrn, toGrnMaterials, verifyNote } from './api';
import { grnMaterialsSchema } from './schemas';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
beforeEach(() => {
  fetchMock.mockReset();
  client.configureApi({ getAuth: () => ({ token: 't', userId: 7, enterpriseId: 102 }) });
});
const respond = (body: unknown) => fetchMock.mockResolvedValueOnce({ status: 200, text: async () => JSON.stringify(body) } as Response);

test('pending queue maps receipts; "-" note code and string documents are normalised', async () => {
  respond(pending);
  const [r] = await fetchPendingGrnNotes();
  expect(r).toMatchObject({ receiptNo: '7002', noteCode: '', supplierName: 'Globex' });
  expect(r?.documents).toEqual([{ uid: 'd1', ext: 'pdf', name: 'bill.pdf' }]);
  expect(r?.auditRemarks[0]?.text).toBe('Rate mismatch');
});

test('an empty queue (response_code 109) is an empty list, not an error', async () => {
  respond({ response_code: 109, response_message: 'Database error' });
  await expect(fetchPendingGrnNotes()).resolves.toEqual([]);
});

test('materials parse', () => {
  expect(toGrnMaterials(grnMaterialsSchema.parse(materials))[0]).toMatchObject({ name: 'Lug', acceptedQty: 50 });
});

test('verify and return payloads', async () => {
  const spy = jest.spyOn(client, 'postOk').mockResolvedValue({ response_code: 200 });
  const r = { receiptNo: '7002', noteId: '9', projectCode: 'PRJ2', projectId: '4' } as Parameters<typeof verifyNote>[0];
  await verifyNote(r, 'ok');
  expect(spy).toHaveBeenCalledWith('auditing/json/verifyNote/', { receipt_no: '7002', grn_number: '7002', note_id: '9', project_code: 'PRJ2', project_id: '4', icd_remarks: 'ok' });
  await returnGrn(r, 'wrong rate');
  expect(spy).toHaveBeenLastCalledWith('auditing/json/returnGrn/', { grn_number: '7002', receipt_no: '7002', note_id: '9', audit_remarks: 'wrong rate' });
});
