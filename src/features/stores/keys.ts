/** @author Lokesh */
import { toApiDate, type DateRange } from '@/core/utils';

const all = ['stores'] as const;
const r = (range: DateRange) => [toApiDate(range.since), toApiDate(range.till)] as const;
export const storesKeys = {
  all,
  dashboard: (range: DateRange) => [...all, 'dashboard', ...r(range)] as const,
  statement: (range: DateRange) => [...all, 'statement', ...r(range)] as const,
  indent: (range: DateRange) => [...all, 'indent', ...r(range)] as const,
  grnStatus: (range: DateRange) => [...all, 'grnStatus', ...r(range)] as const,
  drafts: () => [...all, 'grnDrafts'] as const,
  stockCheck: (itemId: string, makeId: string, range: DateRange, faulty: boolean, excludeDrafts: boolean) => [...all, 'stockCheck', itemId, makeId, ...r(range), faulty, excludeDrafts] as const,
};
