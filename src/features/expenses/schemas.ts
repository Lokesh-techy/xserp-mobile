/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';

const person = z.looseObject({ first_name: zStr, last_name: zStr }).nullish();

export const particularSchema = z.looseObject({
  item_no: zNum,
  expense_head_ledger_id: zId,
  spent_on: zStrOrNull,
  description: zStr,
  amount: zNum,
  approver_debit: zNum,
  audit_debit: zNum,
  bill_available: zBool,
  remarks: zStr,
});

export const expenseSchema = z.looseObject({
  id: zId,
  code: zStr,
  claim_head_ledger_id: zId,
  group_description: zStr,
  status: zNum,
  created_by: zId,
  created_user: person,
  date: zStrOrNull,
  claimed_amount: zNum,
  approved_amount: zNum,
  remarks: zStr,
  particulars: zList(particularSchema),
});
export type ExpenseRow = z.infer<typeof expenseSchema>;

export const expenseGroupSchema = z.looseObject({
  Draft: zList(z.unknown()),
  Confirmed: zList(z.unknown()),
  Approved: zList(z.unknown()),
  Checked: zList(z.unknown()),
  Verified: zList(z.unknown()),
});

export const headsSchema = z.looseObject({ claim_heads: zList(z.looseObject({ id: zId, name: zStr })), expense_heads: zList(z.looseObject({ id: zId, name: zStr })) });
export const savedSchema = z.looseObject({ expense_id: zId.optional(), code: zStr.optional() });
