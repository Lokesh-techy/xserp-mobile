/** @author Lokesh */
import fixture from '../../../__fixtures__/login_api.json';
import { displayName, initials, toSession, userPayloadSchema } from './session-mapper';

test('maps the login payload to a Session', () => {
  const s = toSession(userPayloadSchema.parse(fixture));
  expect(s.token).toBe('FIXTURE_TOKEN');
  expect(typeof s.userId).toBe('number');
  expect(typeof s.enterpriseId).toBe('number');
  expect(s.permissions.PURCHASE).toEqual(
    expect.objectContaining({ view: expect.any(Boolean), approve: expect.any(Boolean) }),
  );
  expect(Object.values(s.counts).every((n) => typeof n === 'number')).toBe(true);
});

test('user_settings payload without token keeps the previous token', () => {
  const prev = toSession(userPayloadSchema.parse(fixture));
  const { token: _t, ...noToken } = fixture as Record<string, unknown>;
  const next = toSession(userPayloadSchema.parse({ ...noToken, icd_enabled: true, oa_pending_count: '4' }), prev);
  expect(next.token).toBe('FIXTURE_TOKEN');
  expect(next.icd.enabled).toBe(true);
  expect(next.counts.oa).toBe(4);
});

test('display helpers', () => {
  const user = { id: 1, username: 'u', email: 'e', firstName: 'Asha', lastName: 'Rao', isSuper: false, enterpriseName: 'X' };
  expect(displayName(user)).toBe('Asha Rao');
  expect(initials(user)).toBe('AR');
  expect(initials({ ...user, firstName: '', lastName: '' })).toBe('U');
});
