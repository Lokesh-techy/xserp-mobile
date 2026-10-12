/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';
import { agingSchema } from '@/core/erp';

// Dashboard lists carry their amount under different keys depending on the query.
const amountRow = z.preprocess(
  (v) => (v && typeof v === 'object' ? { ...(v as object), value: (v as Record<string, unknown>).value ?? (v as Record<string, unknown>).closing_balance ?? (v as Record<string, unknown>).amount } : v),
  z.looseObject({ id: zId, name: zStr, value: zNum, group_name: zStr }),
);

export const financeDashboardSchema = z.looseObject({
  bank: zNum,
  bank_balance: zList(amountRow),
  cash: zNum,
  cash_in_hand: zList(amountRow),
  receivable: zNum,
  receivables: zList(amountRow),
  receivable_others: zNum,
  payable: zNum,
  payables: zList(amountRow),
  payable_others: zNum,
  sales_revenue: zNum,
  tax_liability: zNum,
  sync_datetime: zStrOrNull.optional(),
});

export const taxLiabilitySchema = z.looseObject({ tax_liability: zNum, tax_liable_items: zList(amountRow) });
export const incomeExpenseSchema = z.looseObject({ income_and_expenses: zList(z.looseObject({ month: zStr, income: zNum, expense: zNum })) });
/**
 * get_receivable_aging_details / get_payable_aging_details: the trade and "others" sections of one side, plus when
 * they were computed. No envelope; the cached call answers `null` until ageing has been computed once.
 */
export const agingDetailsSchema = z.looseObject({
  receivable_aging: agingSchema.nullish(),
  receivable_aging_others: agingSchema.nullish(),
  payable_aging: agingSchema.nullish(),
  payable_aging_others: agingSchema.nullish(),
  datetime: zStrOrNull.optional(),
});

/** ledger_balances: every ledger with its cached balance (credit-positive: Cr − Dr). */
export const ledgerBalancesSchema = z.looseObject({
  ledgers: zList(z.looseObject({ id: zId, name: zStr, group_name: zStr, party_code: zStrOrNull.optional(), balance: zNum })),
  computed_on: zStrOrNull.optional(),
});

export const bucketLedgersSchema = z.looseObject({
  ledgers: zList(z.looseObject({ id: zId, party_id: zId, name: zStr, group_name: zStr, closing_balance: zNum, due: zNum, total: zNum, credit_period: zNum })),
});

export const ledgerDataSchema = z.looseObject({
  opening_balance: zNum,
  closing_balance: zNum,
  vouchers: zList(z.looseObject({ code: zStr, date: zStr, is_debit: zBool, value: zNum })),
});

export const ledgerAgingSchema = z.looseObject({ aging: agingSchema.nullish() }).catchall(z.unknown());

export const ledgerBillsSchema = z.looseObject({
  bills: zList(z.looseObject({ bill_no: zStr, bill_date: zStrOrNull, value: zNum, settled: zNum, balance: zNum })),
  unsettled: zNum,
});
