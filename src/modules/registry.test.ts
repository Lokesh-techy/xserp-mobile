/** @author Lokesh */
import fixture from '../../__fixtures__/login_api.json';
import { toSession, userPayloadSchema, type Session } from '@/core/auth';

import { HOME_MODULES, MODULES, moduleAccess, moduleBadge } from './registry';

const base = toSession(userPayloadSchema.parse(fixture));
const none = { view: false, edit: false, delete: false, approve: false, alert: false };
const user = (perms: Session['permissions'], extra: Partial<Session> = {}): Session => ({ ...base, ...extra, user: { ...base.user, isSuper: false }, permissions: perms });
const byId = (id: string) => MODULES.find((m) => m.id === id)!;

test('home shows only live modules, in order (no settings, approvals or coming-soon tiles; reports included)', () => {
  expect(HOME_MODULES.map((m) => m.id)).toEqual(['finance', 'audit', 'purchase', 'sales', 'stores', 'masters', 'expenses', 'reports']);
});

test('locks tiles without view permission and marks API-less modules soon', () => {
  const s = user({ SALES: { ...none, view: true } });
  expect(moduleAccess(byId('sales'), s)).toBe('open');
  expect(moduleAccess(byId('purchase'), s)).toBe('locked');
  expect(moduleAccess(byId('production'), s)).toBe('soon');
});

test('audit needs ICD enabled', () => {
  const s = user({ ICD: { ...none, view: true } }, { icd: { enabled: false, ignoreCreditNote: false, autoGenVoucher: false } });
  expect(moduleAccess(byId('audit'), s)).toBe('locked');
});

test('badges only count where the user can approve', () => {
  const s = user({ SALES: { ...none, view: true, approve: true }, PURCHASE: { ...none, view: true } }, { counts: { ...base.counts, invoice: 2, oa: 3, po: 5 } });
  expect(moduleBadge(byId('sales'), s)).toBe(5);
  expect(moduleBadge(byId('purchase'), s)).toBe(0);
});
