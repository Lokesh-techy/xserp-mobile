/** @author Lokesh */
import { post } from '@/core/api';
import { rangeParams, type DateRange } from '@/core/utils';

import { bucketParams, type BucketRef } from './buckets';
import { agingSummarySchema, bucketLedgersSchema, financeDashboardSchema, incomeExpenseSchema, ledgerBillsSchema, ledgerDataSchema, taxLiabilitySchema } from './schemas';

export const fetchFinanceDashboard = (r: DateRange) => post('accounts/json/dashboard_api/', rangeParams(r), { schema: financeDashboardSchema, timeoutMs: 90_000 });
export const fetchTaxLiability = (r: DateRange) => post('accounts/json/tax_liability/', rangeParams(r), { schema: taxLiabilitySchema });
export const fetchIncomeExpenses = async () => (await post('accounts/json/income_and_expenses/', {}, { schema: incomeExpenseSchema })).income_and_expenses;
export const fetchAging = () => post('accounts/json/aging/', {}, { schema: agingSummarySchema, timeoutMs: 90_000 });
export const fetchBucketLedgers = async (b: BucketRef) => (await post('accounts/json/aging_ledgers/', bucketParams(b), { schema: bucketLedgersSchema, timeoutMs: 90_000 })).ledgers;
export const fetchLedgerData = (ledgerId: string, r: DateRange) => post('accounts/json/ledger_data/', { ledger_id: ledgerId, ...rangeParams(r) }, { schema: ledgerDataSchema, timeoutMs: 90_000 });
export const fetchLedgerBills = (ledgerId: string, isReceivable: boolean) => post('accounts/json/load_ledger_bills/', { ledger_id: ledgerId, is_receivable: String(isReceivable) }, { schema: ledgerBillsSchema });
