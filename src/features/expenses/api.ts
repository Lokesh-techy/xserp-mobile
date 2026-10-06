/** @author Lokesh */
import { z } from 'zod';

import { post, ERP } from '@/core/api';
import { rangeParams, type DateRange } from '@/core/utils';

import { expenseGroupSchema, expenseSchema, headsSchema, savedSchema, type ExpenseRow } from './schemas';
import { STATUS_NAME, type ExpenseStatus } from './status';

export type Particular = {
  raw: Record<string, unknown>;
  itemNo: number;
  headId: string;
  spentOn: string | null;
  description: string;
  amount: number;
  approverDebit: number;
  auditDebit: number;
  billAvailable: boolean;
  remarks: string;
};

export type Expense = {
  raw: Record<string, unknown>;
  id: string;
  code: string;
  status: number;
  claimHeadId: string;
  description: string;
  createdBy: string;
  claimant: string;
  date: string | null;
  claimed: number;
  approved: number;
  remarks: string;
  particulars: Particular[];
};

const name = (p: { first_name: string; last_name: string } | null | undefined) =>
  [p?.first_name, p?.last_name].filter(Boolean).join(' ');

export const toExpense = (r: ExpenseRow): Expense => ({
  raw: r,
  id: r.id,
  code: r.code,
  status: r.status,
  claimHeadId: r.claim_head_ledger_id,
  description: r.group_description,
  createdBy: r.created_by,
  claimant: name(r.created_user),
  date: r.date,
  claimed: r.claimed_amount,
  approved: r.approved_amount,
  remarks: r.remarks,
  particulars: r.particulars.map((p) => ({
    raw: p,
    itemNo: p.item_no,
    headId: p.expense_head_ledger_id,
    spentOn: p.spent_on,
    description: p.description,
    amount: p.amount,
    approverDebit: p.approver_debit,
    auditDebit: p.audit_debit,
    billAvailable: p.bill_available,
    remarks: p.remarks,
  })),
});

/** List responses put rows under the status name (e.g. "Confirmed") or under "expenses". */
export function toListRows(res: unknown, status: ExpenseStatus): Expense[] {
  const obj = (res ?? {}) as Record<string, unknown>;
  const rows = obj[STATUS_NAME[status]] ?? obj.expenses;
  return z
    .array(expenseSchema)
    .catch([])
    .parse(Array.isArray(rows) ? rows : [])
    .map(toExpense);
}

/** Merges edits over the loaded record so fields the app doesn't know (documents, users…) survive the save. */
export function toExpensePayload(e: Expense, status: number): Record<string, unknown> {
  return {
    ...e.raw,
    id: e.id || undefined,
    claim_head_ledger_id: e.claimHeadId,
    group_description: e.description,
    status,
    remarks: e.remarks,
    particulars: e.particulars.map((p, i) => ({
      ...p.raw,
      item_no: p.itemNo || i + 1,
      expense_head_ledger_id: p.headId,
      spent_on: p.spentOn,
      description: p.description,
      amount: p.amount,
      approver_debit: p.approverDebit,
      audit_debit: p.auditDebit,
      bill_available: p.billAvailable ? 1 : 0,
      remarks: p.remarks,
    })),
  };
}

const anyEnvelope = z.looseObject({});
export const fetchExpenses = async (status: ExpenseStatus, range: DateRange) =>
  toListRows(await post(ERP.expenses.list, { status, ...rangeParams(range) }, { schema: anyEnvelope }), status);
export const fetchExpenseGroups = () => post(ERP.expenses.groups, {}, { schema: expenseGroupSchema });
export const fetchExpense = async (id: string) =>
  toExpense(await post(ERP.expenses.get, { expense_id: id }, { schema: expenseSchema }));
export const fetchHeads = (type: 'claim_heads' | 'expense_heads') =>
  post(ERP.expenses.headLedgers, { type }, { schema: headsSchema });
export const saveExpense = (e: Expense, status: number) =>
  post(ERP.expenses.save, { expense_data: toExpensePayload(e, status) }, { schema: savedSchema, timeoutMs: 60_000 });

export const NEW_EXPENSE: Expense = {
  raw: {},
  id: '',
  code: '',
  status: 0,
  claimHeadId: '',
  description: '',
  createdBy: '',
  claimant: '',
  date: null,
  claimed: 0,
  approved: 0,
  remarks: '',
  particulars: [],
};
