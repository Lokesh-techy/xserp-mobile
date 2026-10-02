/** @author Lokesh */
import materials from '../../../__fixtures__/materialNames.json';
import parties from '../../../__fixtures__/partyNames.json';
import * as client from '@/core/api/client';

import { materialNamesSchema, partyNamesSchema } from './schemas';
import { STALE_AFTER_MS, syncMaster, useMasterStore } from './store';

test('fixtures parse into typed rows', () => {
  const p = partyNamesSchema.parse(parties);
  expect(p.party_names[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String) }));
  const m = materialNamesSchema.parse(materials);
  expect(typeof m.material_names[0]?.make_id).toBe('string');
});

test('syncMaster skips fresh lists and refetches stale ones', async () => {
  const spy = jest.spyOn(client, 'post').mockResolvedValue({ party_names: [{ id: '1', code: 'P1', name: 'Acme' }] } as never);
  await syncMaster('parties');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(useMasterStore.getState().data.parties[0]?.name).toBe('Acme');
  await syncMaster('parties');
  expect(spy).toHaveBeenCalledTimes(1);
  useMasterStore.setState((s) => ({ syncedAt: { ...s.syncedAt, parties: Date.now() - STALE_AFTER_MS - 1 } }));
  await syncMaster('parties');
  expect(spy).toHaveBeenCalledTimes(2);
});

test('a failed sync keeps the old rows and records the error', async () => {
  useMasterStore.setState((s) => ({ data: { ...s.data, parties: [{ id: '9', code: 'X', name: 'Kept' }] }, syncedAt: { ...s.syncedAt, parties: null } }));
  jest.spyOn(client, 'post').mockRejectedValueOnce(new Error('offline'));
  await syncMaster('parties');
  expect(useMasterStore.getState().data.parties[0]?.name).toBe('Kept');
  expect(useMasterStore.getState().error.parties).toBe('offline');
});

test('a sync that finishes after switching company is discarded', async () => {
  const { toSession, userPayloadSchema, useSessionStore } = jest.requireActual('@/core/auth') as typeof import('@/core/auth');
  const login = jest.requireActual('../../../__fixtures__/login_api.json');
  const a = toSession(userPayloadSchema.parse(login));
  const b = { ...a, token: 'B', enterpriseId: 999 };
  await useSessionStore.getState().signIn(a);
  let resolve: (v: unknown) => void = () => {};
  jest.spyOn(client, 'post').mockImplementationOnce(() => new Promise((r) => (resolve = r)) as never);
  const sync = syncMaster('parties', { force: true });
  await useSessionStore.getState().signOut();
  await useSessionStore.getState().signIn(b);
  resolve({ party_names: [{ id: '1', code: 'A1', name: 'Company A party' }] });
  await sync;
  expect(useMasterStore.getState().data.parties).toEqual([]);
  expect(useMasterStore.getState().syncing.parties).toBe(false);
  await useSessionStore.getState().signOut();
});
