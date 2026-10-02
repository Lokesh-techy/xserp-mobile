/** @author Lokesh */
import { toApiDate, type DateRange } from '@/core/utils';

const all = ['finance'] as const;
const r = (range: DateRange) => [toApiDate(range.since), toApiDate(range.till)] as const;
export const financeKeys = {
  all,
  dashboard: (range: DateRange) => [...all, 'dashboard', ...r(range)] as const,
  tax: (range: DateRange) => [...all, 'tax', ...r(range)] as const,
  incomeExpenses: () => [...all, 'incomeExpenses'] as const,
  aging: () => ['accounts', 'aging'] as const,
  bucket: (param: string) => [...all, 'bucket', param] as const,
  ledger: (id: string, range: DateRange) => [...all, 'ledger', id, ...r(range)] as const,
  bills: (id: string) => [...all, 'bills', id] as const,
};
