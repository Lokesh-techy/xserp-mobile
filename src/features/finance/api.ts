/** @author Lokesh */
import { ApiError, post, ERP } from '@/core/api';
import type { Aging } from '@/core/erp';
import { rangeParams, type DateRange } from '@/core/utils';

import { bucketParams, type BucketRef } from './buckets';
import {
  agingDetailsSchema,
  bucketLedgersSchema,
  financeDashboardSchema,
  incomeExpenseSchema,
  ledgerBillsSchema,
  ledgerBalancesSchema,
  ledgerDataSchema,
  taxLiabilitySchema,
} from './schemas';

export const fetchFinanceDashboard = (r: DateRange) =>
  post(ERP.accounts.dashboard, rangeParams(r), { schema: financeDashboardSchema, timeoutMs: 90_000 });
export const fetchTaxLiability = (r: DateRange) =>
  post(ERP.accounts.taxLiability, rangeParams(r), { schema: taxLiabilitySchema });
export const fetchIncomeExpenses = async () =>
  (await post(ERP.accounts.incomeAndExpenses, {}, { schema: incomeExpenseSchema })).income_and_expenses;

/**
 * One side's ageing (trade + others), as the web dashboard shows it. `live` recomputes on the server — slow — and
 * saves the result for the next cached read. Cached reads answer `null` until it has been computed once: then null.
 */
export async function fetchAgeingSide(receivable: boolean, live: boolean) {
  const path = receivable ? ERP.accounts.receivableAgingDetails : ERP.accounts.payableAgingDetails;
  try {
    // compact: the server leaves out the per-voucher advance/un-billed lists (web modals) — the bulk of the payload.
    return await post(path, { is_live: live ? 1 : 0, compact: 1 }, { schema: agingDetailsSchema, timeoutMs: live ? 180_000 : 30_000 });
  } catch (e) {
    if (!live && e instanceof ApiError && e.kind === 'validation') return null;
    throw e;
  }
}

export type AgeingSide = { trade: Aging | null; others: Aging | null; computedAt: string | null };

/** One side's sections. A side the server has never computed is computed live once. */
export async function fetchAgeingSideData(receivable: boolean, live: boolean): Promise<AgeingSide> {
  const d = (await fetchAgeingSide(receivable, live)) ?? (await fetchAgeingSide(receivable, true));
  return receivable
    ? { trade: d?.receivable_aging ?? null, others: d?.receivable_aging_others ?? null, computedAt: d?.datetime ?? null }
    : { trade: d?.payable_aging ?? null, others: d?.payable_aging_others ?? null, computedAt: d?.datetime ?? null };
}

/** Both sides' saved figures together, so flipping Receivable ⇄ Payable never waits. */
export async function fetchAgeing() {
  const [receivable, payable] = await Promise.all([fetchAgeingSideData(true, false), fetchAgeingSideData(false, false)]);
  return { receivable, payable };
}
export type AgeingData = Awaited<ReturnType<typeof fetchAgeing>>;

export const fetchLedgerBalances = () => post(ERP.accounts.ledgerBalances, {}, { schema: ledgerBalancesSchema, timeoutMs: 60_000 });
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
