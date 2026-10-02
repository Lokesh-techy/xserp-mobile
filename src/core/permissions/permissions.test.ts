/** @author Lokesh */
import fixture from '../../../__fixtures__/login_api.json';
import { toSession, userPayloadSchema } from '../auth/session-mapper';
import { can } from './permissions';

const base = toSession(userPayloadSchema.parse(fixture));
const deny = { view: false, edit: false, delete: false, approve: false, alert: false };

test('reads the permission bit', () => {
  const s = { ...base, user: { ...base.user, isSuper: false }, permissions: { SALES: { ...deny, view: true } } };
  expect(can(s, 'SALES', 'view')).toBe(true);
  expect(can(s, 'SALES', 'approve')).toBe(false);
  expect(can(s, 'PURCHASE', 'view')).toBe(false);
});

test('super users pass everything; ICD also needs icd_enabled', () => {
  const su = { ...base, user: { ...base.user, isSuper: true }, permissions: {} };
  expect(can(su, 'PURCHASE', 'approve')).toBe(true);
  expect(can({ ...su, icd: { ...su.icd, enabled: false } }, 'ICD', 'view')).toBe(false);
});
