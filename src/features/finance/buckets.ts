/** @author Lokesh */
import type { Aging } from '@/core/erp';

export type Bucket = { key: 'age1' | 'age2' | 'age3' | 'age4' | 'advance'; label: string; startDays: number; endDays: number; isAdvance: boolean };

export const BUCKETS: Bucket[] = [
  { key: 'age1', label: '0–30 days', startDays: 0, endDays: 30, isAdvance: false },
  { key: 'age2', label: '31–60 days', startDays: 31, endDays: 60, isAdvance: false },
  { key: 'age3', label: '61–90 days', startDays: 61, endDays: 90, isAdvance: false },
  { key: 'age4', label: '90+ days', startDays: 91, endDays: 100000, isAdvance: false },
  { key: 'advance', label: 'Advance', startDays: 0, endDays: 100000, isAdvance: true },
];

export type BucketRef = { receivable: boolean; bucket: Bucket };

/** Route param `r-age2` / `p-advance`. */
export const bucketParam = (receivable: boolean, key: Bucket['key']) => `${receivable ? 'r' : 'p'}-${key}`;

export function bucketFromParam(param: string): BucketRef | null {
  const [side, key] = param.split('-');
  const bucket = BUCKETS.find((b) => b.key === key);
  if (!bucket || (side !== 'r' && side !== 'p')) return null;
  return { receivable: side === 'r', bucket };
}

export const bucketParams = ({ receivable, bucket }: BucketRef) => ({
  is_receivable: String(receivable),
  option: 'ledgers',
  is_advance: String(bucket.isAdvance),
  start_days: bucket.startDays,
  end_days: bucket.endDays,
});

export const bucketAmount = (a: Aging, key: Bucket['key']) => a[key];

/** Debtor ledgers are receivable, creditors payable; anything else has no bills view. */
export function isReceivableGroup(group: string): boolean | null {
  if (/debtor/i.test(group)) return true;
  if (/creditor/i.test(group)) return false;
  return null;
}
