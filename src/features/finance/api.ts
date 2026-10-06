/** @author Lokesh */
import { post, ERP } from '@/core/api';
import { rangeParams, type DateRange } from '@/core/utils';

import { bucketParams, type BucketRef } from './buckets';
import {
  agingSummarySchema,
  bucketLedgersSchema,
  financeDashboardSchema,
  incomeExpenseSchema,
  ledgerBillsSchema,
  ledgerDataSchema,
  taxLiabilitySchema,
} from './schemas';

export const fetchFinanceDashboard = (r: DateRange) =>
  post(ERP.accounts.dashboard, rangeParams(r), { schema: financeDashboardSchema, timeoutMs: 90_000 });
export const fetchTaxLiability = (r: DateRange) =>
  post(ERP.accounts.taxLiability, rangeParams(r), { schema: taxLiabilitySchema });
export const fetchIncomeExpenses = async () =>
  (await post(ERP.accounts.incomeAndExpenses, {}, { schema: incomeExpenseSchema })).income_and_expenses;
export const fetchAging = () => post(ERP.accounts.aging, {}, { schema: agingSummarySchema, timeoutMs: 90_000 });
export const fetchBucketLedgers = async (b: BucketRef) =>
  (await post(ERP.accounts.agingLedgers, bucketParams(b), { schema: bucketLedgersSchema, timeoutMs: 90_000 })).ledgers;
export const fetchLedgerData = (ledgerId: string, r: DateRange) =>
  post(
    ERP.accounts.ledgerData,
    { ledger_id: ledgerId, ...rangeParams(r) },
    { schema: ledgerDataSchema, timeoutMs: 90_000 },
  );
export const fetchLedgerBills = (ledgerId: string, isReceivable: boolean) =>
  post(
    ERP.accounts.ledgerBills,
    { ledger_id: ledgerId, is_receivable: String(isReceivable) },
    { schema: ledgerBillsSchema },
  );
