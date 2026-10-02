/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';
import { agingSchema } from '@/core/erp';

// Dashboard lists carry their amount under different keys depending on the query.
const amountRow = z.preprocess(
  (v) => (v && typeof v === 'object' ? { ...(v as object), value: (v as Record<string, unknown>).value ?? (v as Record<string, unknown>).closing_balance ?? (v as Record<string, unknown>).amount } : v),
  z.looseObject({ id: zId, name: zStr, value: zNum }),
);

export const financeDashboardSchema = z.looseObject({
  bank: zNum,
  bank_balance: zNum,
  cash: zNum,
  cash_in_hand: zNum,
  receivable: zNum,
  receivables: zList(amountRow),
  payable: zNum,
  payables: zList(amountRow),
  sales_revenue: zNum,
  tax_liability: zNum,
  sync_datetime: zStrOrNull.optional(),
});

export const taxLiabilitySchema = z.looseObject({ tax_liability: zNum, tax_liable_items: zList(amountRow) });
export const incomeExpenseSchema = z.looseObject({ income_and_expenses: zList(z.looseObject({ month: zStr, income: zNum, expense: zNum })) });
export const agingSummarySchema = z.looseObject({ receivable_aging: agingSchema.nullish(), payable_aging: agingSchema.nullish() });

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
