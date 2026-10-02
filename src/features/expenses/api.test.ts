/** @author Lokesh */
import groups from '../../../__fixtures__/expenses/expense_group_list.json';
import list from '../../../__fixtures__/expenses/expense_list.json';
import one from '../../../__fixtures__/expenses/get_expense.json';
import login from '../../../__fixtures__/login_api.json';
import { toSession, userPayloadSchema, type Session } from '@/core/auth';

import { toExpense, toExpensePayload, toListRows } from './api';
import { expenseGroupSchema, expenseSchema } from './schemas';
import { nextSteps, STATUS } from './status';

const base = toSession(userPayloadSchema.parse(login));
const none = { view: false, edit: false, delete: false, approve: false, alert: false };
const as = (userId: number, perms: Session['permissions'], isSuper = false): Session => ({ ...base, userId, user: { ...base.user, id: userId, isSuper }, permissions: perms, icd: { ...base.icd, enabled: true } });

test('list rows come from the status-name key or from expenses', () => {
  expect(toListRows(list, STATUS.CONFIRMED)[0]).toMatchObject({ id: '301', claimant: 'Ravi S', claimed: 4500, status: 1 });
  expect(toListRows({ response_code: 200, expenses: [{ id: 9, status: 0 }] }, STATUS.DRAFT)[0]?.id).toBe('9');
  expect(toListRows({ response_code: 200 }, STATUS.DRAFT)).toEqual([]);
});

test('group counts', () => {
  expect(expenseGroupSchema.parse(groups)).toMatchObject({ Confirmed: [{}, {}] });
});

test('payload keeps unknown fields and documents untouched', () => {
  const e = toExpense(expenseSchema.parse(one));
  const payload = toExpensePayload({ ...e, description: 'Site visit (edited)', particulars: e.particulars.map((p) => ({ ...p, approverDebit: p.itemNo === 2 ? 500 : 0 })) }, 2);
  expect(payload).toMatchObject({ id: '301', financial_year: '25-26', group_description: 'Site visit (edited)', status: 2 });
  const [p1, p2] = payload.particulars as Record<string, unknown>[];
  expect(p1?.document).toEqual({ uid: 'x1', ext: 'jpg', name: 'taxi.jpg' });
  expect(p2?.approver_debit).toBe(500);
});

describe('workflow', () => {
  const draft = { status: STATUS.DRAFT, createdBy: '8' };
  const confirmed = { status: STATUS.CONFIRMED, createdBy: '8' };
  it('owner confirms a draft', () => {
    expect(nextSteps(draft, as(8, { EXPENSES: { ...none, edit: true } })).map((s) => s.to)).toEqual([STATUS.CONFIRMED]);
    expect(nextSteps(draft, as(9, { EXPENSES: { ...none, approve: true } }))).toEqual([]);
  });
  it('approver (not the claimant) approves or returns', () => {
    expect(nextSteps(confirmed, as(9, { EXPENSES: { ...none, approve: true } })).map((s) => s.id)).toEqual(['approve', 'return']);
    expect(nextSteps(confirmed, as(8, { EXPENSES: { ...none, approve: true } }))).toEqual([]);
  });
  it('auditor checks then verifies', () => {
    const auditor = as(10, { ICD: { ...none, view: true, approve: true } });
    expect(nextSteps({ status: STATUS.APPROVED, createdBy: '8' }, auditor).map((s) => s.to)).toEqual([STATUS.CHECKED]);
    expect(nextSteps({ status: STATUS.CHECKED, createdBy: '8' }, auditor).map((s) => s.to)).toEqual([STATUS.VERIFIED]);
    expect(nextSteps({ status: STATUS.VERIFIED, createdBy: '8' }, as(1, {}, true))).toEqual([]);
  });
});
