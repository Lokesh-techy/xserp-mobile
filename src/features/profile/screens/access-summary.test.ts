/** @author Lokesh */
import { accessSummary } from './profile-screen';

const perm = (view: boolean, approve: boolean) => ({ view, approve, edit: false, delete: false, alert: false });
const sub = (expiredOn: string | null) => ({
  plan: 'trial',
  expiredOn,
  isExpired: false,
  showExpiry: false,
  canRequestExtension: false,
  extensionRequestedOn: null,
  enterpriseActive: true,
});

test('counts viewable modules, approval rights and days left on the plan', () => {
  const s = accessSummary(
    {
      permissions: { SALES: perm(true, true), PURCHASE: perm(true, false), STORES: perm(false, false) },
      subscription: sub('2026-10-18'),
    },
    new Date(2026, 9, 8),
  );
  expect(s).toEqual({ modules: 2, approve: 1, daysLeft: 10 });
});

test('no expiry date means no day count, and a lapsed plan never goes negative', () => {
  expect(accessSummary({ permissions: {}, subscription: sub(null) }).daysLeft).toBeNull();
  expect(accessSummary({ permissions: {}, subscription: sub('2026-01-01') }, new Date(2026, 9, 8)).daysLeft).toBe(0);
});
