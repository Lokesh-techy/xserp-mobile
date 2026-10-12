/** @author Lokesh */
import type { Aging } from '@/core/erp';

/** Trade = Sundry Debtors / Creditors; others = Other Current Assets / Liabilities — the web dashboard's four sections. */
export type AgeingScope = 'trade' | 'others';

export type BucketKey = 'advance' | 'billable' | 'excess' | 'age1' | 'age2' | 'age3' | 'age4' | 'age5' | 'age6';

/**
 * One ageing figure. Ranges match the server (`datediff(today, bill_date)`, backend getAgeWiseDue).
 * `drill`: whether aging_ledgers can list its ledgers — un-billed and excess have no ledger view.
 */
export type Bucket = { key: BucketKey; label: string; startDays: number; endDays: number; isAdvance: boolean; drill: boolean };

const age = (key: BucketKey, label: string, startDays: number, endDays: number): Bucket => ({ key, label, startDays, endDays, isAdvance: false, drill: true });

export const AGE_BUCKETS: Bucket[] = [
  age('age1', '< 30 days', 0, 30),
  age('age2', '30–60 days', 31, 60),
  age('age3', '60–90 days', 61, 90),
  age('age4', '90–120 days', 91, 120),
  age('age5', '120–180 days', 121, 180),
  age('age6', '> 180 days', 181, 100000),
];

/** Credits not yet matched to bills: advances, un-billed receipts/payments, and the opposite-side excess. */
export const OTHER_BUCKETS: Bucket[] = [
  { key: 'advance', label: 'Advances', startDays: 0, endDays: 100000, isAdvance: true, drill: true },
  { key: 'billable', label: 'Un-billed', startDays: 0, endDays: 100000, isAdvance: false, drill: false },
  { key: 'excess', label: 'Excess', startDays: 0, endDays: 100000, isAdvance: false, drill: false },
];

export const BUCKETS: Bucket[] = [...AGE_BUCKETS, ...OTHER_BUCKETS];

/** "Excess received" on the receivable side, "excess paid" on the payable side — as the web labels it. */
export const bucketLabel = (b: Bucket, receivable: boolean) => (b.key === 'excess' ? (receivable ? 'Excess received' : 'Excess paid') : b.label);

const GROUPS: Record<AgeingScope, [receivable: string, payable: string]> = {
  trade: ['Sundry Debtors', 'Sundry Creditors'],
  others: ['Other Current Assets', 'Other Current Liabilities'],
};
export const ageingGroup = (receivable: boolean, scope: AgeingScope) => GROUPS[scope][receivable ? 0 : 1];

export const sectionTitle = (receivable: boolean, scope: AgeingScope) =>
  `${receivable ? 'Receivables' : 'Payables'}${scope === 'others' ? ' (others)' : ''}`;

export type BucketRef = { receivable: boolean; scope: AgeingScope; bucket: Bucket };

/** Route param `r-age2` / `p-advance` (trade), `ro-age5` / `po-age1` (others). */
export const bucketParam = (receivable: boolean, scope: AgeingScope, key: BucketKey) =>
  `${receivable ? 'r' : 'p'}${scope === 'others' ? 'o' : ''}-${key}`;

export function bucketFromParam(param: string): BucketRef | null {
  const m = /^([rp])(o?)-(\w+)$/.exec(param);
  const bucket = m && BUCKETS.find((b) => b.key === m[3]);
  if (!m || !bucket?.drill) return null;
  return { receivable: m[1] === 'r', scope: m[2] ? 'others' : 'trade', bucket };
}

/** aging_ledgers params. With option=ledgers the server reads the flags as `int(...)`, so they go as 1/0. */
export const bucketParams = ({ receivable, scope, bucket }: BucketRef) => ({
  is_receivable: receivable ? 1 : 0,
  option: 'ledgers',
  is_advance: bucket.isAdvance ? 1 : 0,
  start_days: bucket.startDays,
  end_days: bucket.endDays,
  group_name: ageingGroup(receivable, scope),
});

/** The server stores payable advances negated; every card shows the magnitude. */
export const bucketAmount = (a: Aging, key: BucketKey) => Math.abs(a[key]);

/** Debtor ledgers are receivable, creditors payable; anything else has no bills view. */
export function isReceivableGroup(group: string): boolean | null {
  if (/debtor/i.test(group)) return true;
  if (/creditor/i.test(group)) return false;
  return null;
}
